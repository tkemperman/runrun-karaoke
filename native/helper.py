#!/usr/bin/env python3
"""Firefox native protocol v1; credentials exist only in worker memory."""
import http.client
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

PROTOCOL = 1
API = "https://api.audioshake.ai"
MAX_DURATION = 2700
WRITE_LOCK = threading.Lock()
REQUEST_ID = re.compile(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}")

class Cancelled(Exception):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def distro(path="/etc/os-release"):
    result = {}
    try:
        for line in Path(path).read_text().splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                if key in ("ID", "ID_LIKE", "PRETTY_NAME"):
                    result[key] = value.strip('"\'')
    except OSError:
        pass
    return result


def status():
    dependencies = {"Python": {"available": sys.version_info >= (3, 10), "version": sys.version.split()[0]}}
    for label, command, argument in [("yt-dlp", "yt-dlp", "--version"), ("FFmpeg", "ffmpeg", "-version"), ("FFprobe", "ffprobe", "-version"), ("JavaScript runtime (Deno)", "deno", "--version")]:
        version = ""
        executable = shutil.which(command)
        if executable:
            try:
                # The command name comes from the fixed list above and is resolved before execution.
                check = subprocess.run([executable, argument], capture_output=True, text=True, timeout=5)  # noqa: S603
                if check.returncode == 0:
                    version = check.stdout.splitlines()[0][:150]
            except (OSError, subprocess.TimeoutExpired):
                pass
        dependencies[label] = {"available": bool(version), "version": version}
    return {"protocol": PROTOCOL, "ready": all(row["available"] for row in dependencies.values()), "distro": distro(), "dependencies": dependencies}


def send(message):
    data = json.dumps(message, ensure_ascii=False, allow_nan=False).encode("utf-8")
    if len(data) > 1000000:
        data = b'{"type":"error","error":"Native result exceeds the message limit."}'
    with WRITE_LOCK:
        sys.stdout.buffer.write(struct.pack("@I", len(data)) + data)
        sys.stdout.buffer.flush()


def read_message(stream):
    size = stream.read(4)
    if not size:
        return None
    if len(size) != 4:
        raise ValueError("Truncated message header.")
    length = struct.unpack("@I", size)[0]
    if length > 1000000:
        raise ValueError("Native request is too large.")
    data = stream.read(length)
    if len(data) != length:
        raise ValueError("Truncated message.")
    message = json.loads(data)
    if not isinstance(message, dict):
        raise ValueError("Native request must be an object.")
    return message


def private_directory(path):
    """Create or verify a directory which cannot be modified by another user."""
    path = Path(path)
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise OSError("Helper data directory must be private and owned by the current user.")
    return path


def limited_json(response, limit, service):
    raw = response.read(limit + 1)
    if len(raw) > limit:
        raise RuntimeError(f"{service} response is too large.")
    return json.loads(raw)


def validate_request(message):
    if not isinstance(message, dict):
        raise ValueError("Invalid native request.")
    if not re.fullmatch(r"[\w-]{11}", message.get("videoId", "")):
        raise ValueError("Invalid video ID.")
    if not REQUEST_ID.fullmatch(message.get("requestId", "")):
        raise ValueError("Invalid request ID.")
    seconds = message.get("duration")
    if isinstance(seconds, bool) or not isinstance(seconds, (int, float)) or not math.isfinite(seconds) or not 0 < seconds <= MAX_DURATION:
        raise ValueError("Only complete finite videos up to 45 minutes are supported.")
    key = message.get("apiKey")
    if not isinstance(key, str) or not key.strip() or len(key) > 1000 or re.search(r"[\r\n]", key):
        raise ValueError("Enter your AudioShake API key.")
    if not re.fullmatch(r"auto|[a-z]{2}", message.get("language", "auto")):
        raise ValueError("Invalid language.")
    transcript = message.get("transcript")
    if transcript is not None and (not isinstance(transcript, str) or not transcript.strip() or len(transcript) > 300000):
        raise ValueError("Invalid transcript.")


def audio_cache_path(video_id, cache_dir=None, create=True):
    if not isinstance(video_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("Invalid video ID.")
    folder = Path(cache_dir or Path(tempfile.gettempdir()) / f"runrun-karaoke-audio-{os.getuid()}")
    if create:
        private_directory(folder)
    elif not folder.exists():
        raise FileNotFoundError(folder)
    info = folder.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise OSError("Audio cache must be a private directory owned by the current user.")
    return folder / (video_id + ".mp3")


def audio_cache_exists(video_id, cache_dir=None):
    try:
        info = audio_cache_path(video_id, cache_dir, create=False).lstat()
        return stat.S_ISREG(info.st_mode)
    except FileNotFoundError:
        return False


def clear_audio_cache(video_id, cache_dir=None):
    try:
        audio_cache_path(video_id, cache_dir, create=False).unlink()
    except FileNotFoundError:
        return False
    return True


class Worker:
    def __init__(self, message, emit=send, state_dir=None, cache_dir=None):
        self.message = message
        self.emit = emit
        self.cancelled = threading.Event()
        self.process = None
        self.state_dir = Path(state_dir or Path.home() / ".local/state/runrun-karaoke-helper")
        self.receipt = self.state_dir / (message["requestId"] + ".json")
        self.cache_dir = Path(cache_dir or Path(tempfile.gettempdir()) / f"runrun-karaoke-audio-{os.getuid()}")
        self.task_id = None

    def check(self):
        if self.cancelled.is_set():
            raise Cancelled()

    def progress(self, stage, **extra):
        self.emit({"type": "progress", "stage": stage, **extra})

    def record(self, value):
        private_directory(self.state_dir)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile("w", dir=self.state_dir, prefix=".receipt-", delete=False) as file:
                temporary = Path(file.name)
                os.fchmod(file.fileno(), 0o600)
                json.dump(value, file)
                file.flush()
                os.fsync(file.fileno())
            temporary.replace(self.receipt)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def read_receipt(self):
        private_directory(self.state_dir)
        info = self.receipt.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise OSError("Task receipt must be a private regular file.")
        return json.loads(self.receipt.read_text())

    def api(self, path, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        # API is a fixed HTTPS origin; path is internal or contains a validated task ID.
        request = urllib.request.Request(API + path, data=data, headers={"x-api-key": self.message["apiKey"], "Content-Type": "application/json"})  # noqa: S310
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
                return limited_json(response, 3000000, "AudioShake")
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"AudioShake returned HTTP {error.code}. Check your key, account access or quota.") from None
        except (OSError, ValueError):
            raise RuntimeError("Could not reach AudioShake or read its response. Resume this task; do not submit again.") from None

    def upload(self, path, mime):
        self.check()
        boundary = uuid.uuid4().hex
        head = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\nContent-Type: {mime}\r\n\r\n').encode()
        tail = f"\r\n--{boundary}--\r\n".encode()
        size = path.stat().st_size
        connection = http.client.HTTPSConnection("api.audioshake.ai", timeout=60)
        try:
            connection.putrequest("POST", "/assets")
            connection.putheader("x-api-key", self.message["apiKey"])
            connection.putheader("Content-Type", f"multipart/form-data; boundary={boundary}")
            connection.putheader("Content-Length", str(len(head) + size + len(tail)))
            connection.endheaders()
            connection.send(head)
            count = 0
            with path.open("rb") as file:
                while chunk := file.read(262144):
                    self.check()
                    connection.send(chunk)
                    count += len(chunk)
                    self.progress("upload", percent=round(count * 100 / max(1, size)), file=path.name)
            connection.send(tail)
            response = connection.getresponse()
            if not 200 <= response.status < 300:
                raise RuntimeError(f"AudioShake upload failed (HTTP {response.status}).")
            asset = limited_json(response, 1000000, "AudioShake upload")
            if not isinstance(asset.get("id"), str):
                raise RuntimeError("AudioShake did not return an asset ID.")
            return asset["id"]
        finally:
            connection.close()

    def run_command(self, args, folder, stage):
        self.check()
        # Files avoid pipe deadlocks and are removed with all other temporary data.
        last_percent = None
        with (folder / "stdout").open("w+") as stdout, (folder / "stderr").open("w+") as stderr:
            # All argument vectors are assembled internally from fixed tools, validated IDs and private paths.
            self.process = subprocess.Popen(args, stdout=stdout, stderr=stderr, text=True, start_new_session=True)  # noqa: S603
            started = time.monotonic()
            try:
                while self.process.poll() is None:
                    self.check()
                    if time.monotonic() - started > 900:
                        raise RuntimeError("Audio download/conversion timed out.")
                    stdout.flush()
                    # yt-dlp emits a numeric progress line without leaking source URLs.
                    with (folder / "stdout").open() as progress_file:
                        progress_text = progress_file.read()[-4000:]
                    percentages = re.findall(r"runrun-progress:\s*([0-9.]+)%", progress_text)
                    percent = min(100, float(percentages[-1])) if percentages else None
                    if percent != last_percent or percent is None:
                        self.progress(stage, **({"percent": percent} if percent is not None else {}))
                        last_percent = percent
                    self.cancelled.wait(1)
                self.check()
                if self.process.returncode:
                    raise RuntimeError(f"{args[0]} failed. Update yt-dlp and verify this video is publicly playable without signing in.")
                stdout.seek(0)
                return stdout.read(3000000)
            finally:
                if self.process.poll() is None:
                    os.killpg(self.process.pid, signal.SIGTERM)
                    try:
                        self.process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        os.killpg(self.process.pid, signal.SIGKILL)
                        self.process.wait()
                self.process = None

    def download(self, folder):
        url = "https://www.youtube.com/watch?v=" + self.message["videoId"]
        base = ["yt-dlp", "--ignore-config", "--no-playlist", "--no-warnings", "--js-runtimes", "deno", "--socket-timeout", "30"]
        metadata = json.loads(self.run_command(base + ["--dump-single-json", "--skip-download", url], folder, "download"))
        seconds = metadata.get("duration")
        if metadata.get("is_live") or metadata.get("live_status") in ("is_live", "is_upcoming", "post_live") or not isinstance(seconds, (int, float)) or not 0 < seconds <= MAX_DURATION:
            raise ValueError("Livestreams, unfinished videos and videos over 45 minutes are not supported.")
        if abs(seconds - self.message["duration"]) > 2:
            raise ValueError("Downloaded audio duration does not match the current video.")
        self.run_command(base + ["-f", "bestaudio", "--max-filesize", "300M", "--newline", "--progress-template", "download:runrun-progress:%(progress._percent_str)s", "-o", str(folder / "source.%(ext)s"), url], folder, "download")
        sources = list(folder.glob("source.*"))
        if len(sources) != 1 or sources[0].stat().st_size > 300000000:
            raise ValueError("Audio download is missing or too large.")
        audio = folder / "audio.mp3"
        self.run_command(["ffmpeg", "-nostdin", "-v", "error", "-i", str(sources[0]), "-vn", "-c:a", "libmp3lame", "-b:a", "192k", str(audio)], folder, "convert")
        self.validate_audio(audio, folder, seconds)
        return audio

    def validate_audio(self, audio, folder, seconds, stage="convert"):
        if not audio.is_file() or not 0 < audio.stat().st_size <= 300000000:
            raise ValueError("Audio file is missing, empty or too large.")
        measured = float(self.run_command(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio)], folder, stage))
        if not math.isfinite(measured) or abs(measured - seconds) > 2:
            raise ValueError("Converted audio duration does not match the video.")

    def cached_audio_path(self):
        return audio_cache_path(self.message["videoId"], self.cache_dir)

    def prepare_audio(self, folder):
        self.check()
        audio = folder / "audio.mp3"
        cached = None
        try:
            cached = self.cached_audio_path()
            info = cached.lstat()
            if not stat.S_ISREG(info.st_mode) or not 0 < info.st_size <= 300000000:
                raise ValueError("Invalid cached audio.")
            # Use a task-local copy so cleanup or another task cannot remove an active upload.
            shutil.copyfile(cached, audio)
            self.validate_audio(audio, folder, self.message["duration"], "checking cached audio")
        except (OSError, ValueError, RuntimeError):
            audio.unlink(missing_ok=True)
        else:
            self.progress("reusing downloaded audio")
            return audio

        self.check()
        audio = self.download(folder)
        self.check()
        if cached is not None:
            temporary = None
            try:
                # Publish only a complete, validated MP3; partial downloads never enter the cache.
                with tempfile.NamedTemporaryFile(dir=self.cache_dir, prefix=".audio-", delete=False) as file:
                    temporary = Path(file.name)
                shutil.copyfile(audio, temporary)
                self.check()
                temporary.replace(cached)
            except OSError:
                pass  # An unavailable cache must not prevent timing a successfully downloaded track.
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
        return audio

    def submit(self):
        if not status()["ready"]:
            raise RuntimeError("Helper dependencies are missing. Open Installation instructions and Check again.")
        with tempfile.TemporaryDirectory(prefix="runrun-audio-") as temporary:
            folder = Path(temporary)
            audio = self.prepare_audio(folder)
            asset = self.upload(audio, "audio/mpeg")
            target = {"model": "alignment", "formats": ["json"]}
            if self.message.get("language", "auto") != "auto":
                target["language"] = self.message["language"]
            if self.message.get("transcript"):
                transcript = folder / "transcript.txt"
                transcript.write_text(self.message["transcript"], encoding="utf-8")
                target["transcriptAssetId"] = self.upload(transcript, "text/plain; charset=utf-8")
            self.check()
            # Write before POST: a lost create response must never trigger another billable POST.
            self.record({"state": "submitting", "videoId": self.message["videoId"]})
            self.progress("submitting")
            task = self.api("/tasks", {"assetId": asset, "targets": [target], "metadata": self.message["requestId"]})
            if not isinstance(task.get("id"), str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,200}", task["id"]):
                raise RuntimeError("Task submission is uncertain. Check the AudioShake dashboard; this request will not be resubmitted.")
            self.task_id = task["id"]
            self.record({"state": "submitted", "taskId": self.task_id, "videoId": self.message["videoId"]})
            self.emit({"type": "task", "taskId": self.task_id})
        # Task files are gone; only validated audio remains cached for another timing request.

    def poll(self):
        for _ in range(720):
            self.check()
            self.progress("processing", taskId=self.task_id)
            task = self.api("/tasks/" + self.task_id)
            target = next((t for t in task.get("targets", []) if t.get("model") == "alignment"), None)
            if not target:
                raise RuntimeError("AudioShake returned no alignment target.")
            self.emit({"type": "billing", "taskId": self.task_id, "createdAt": task.get("createdAt"), "credits": target.get("cost")})
            if target.get("status") == "error":
                raise RuntimeError("AudioShake could not process this task. Check its dashboard for details.")
            if target.get("status") == "completed":
                output = next((o for o in target.get("output", []) if o.get("format") == "json"), None)
                if not output or urllib.parse.urlparse(output.get("link", "")).scheme != "https":
                    raise RuntimeError("AudioShake returned no HTTPS JSON output.")
                self.check()
                # Presigned downloads never receive the API key.
                with urllib.request.build_opener(NoRedirect).open(output["link"], timeout=60) as response:
                    raw = response.read(10000001)
                if len(raw) > 10000000:
                    raise RuntimeError("AudioShake result is too large.")
                result = json.loads(raw)
                if not isinstance(result, dict) or not isinstance(result.get("lines"), list):
                    raise ValueError("AudioShake returned an invalid lyric result.")
                # This release only needs line timing; keep native messages bounded.
                compact = []
                for line in result["lines"]:
                    if not isinstance(line, dict):
                        raise ValueError("AudioShake returned an invalid lyric line.")
                    words = line.get("words") or []
                    compact.append({"text": line.get("text"), "start": line.get("start", words[0].get("start") if words else None), "end": line.get("end", words[-1].get("end") if words else None)})
                result = {"lines": compact, "language": result.get("language")}
                self.check()
                self.emit({"type": "result", "taskId": self.task_id, "result": result})
                return
            self.cancelled.wait(5)
        raise RuntimeError("Still processing. Resume this existing task later.")

    def run(self):
        try:
            validate_request(self.message)
            if self.receipt.exists():
                receipt = self.read_receipt()
                if receipt.get("videoId") != self.message["videoId"]:
                    raise ValueError("Task belongs to a different video.")
                self.task_id = receipt.get("taskId")
                if not self.task_id:
                    raise RuntimeError("Submission outcome is uncertain. Check the AudioShake dashboard. This request will never submit a second task.")
                self.emit({"type": "task", "taskId": self.task_id})
            elif self.message.get("taskId"):
                if not re.fullmatch(r"[A-Za-z0-9_-]{1,200}", self.message["taskId"]):
                    raise ValueError("Invalid task ID.")
                self.task_id = self.message["taskId"]
            elif self.message.get("resume"):
                raise RuntimeError("No saved task receipt. Check the AudioShake dashboard before starting a new task.")
            else:
                self.submit()
            self.poll()
        except Cancelled:
            self.emit({"type": "cancelled", "taskId": self.task_id})
        except Exception as error:
            # Never emit arbitrary network/OS exceptions which could contain URLs or credentials.
            safe = str(error) if isinstance(error, (RuntimeError, ValueError)) else "Helper connection or processing failed. Resume the existing task."
            self.emit({"type": "error", "error": safe, "taskId": self.task_id})
        finally:
            self.message.pop("apiKey", None)


def main():
    worker = thread = None
    try:
        while message := read_message(sys.stdin.buffer):
            if message.get("type") == "status":
                send({"type": "status", **status()})
            elif message.get("type") == "audio-cache-status":
                try:
                    send({"type": "audio-cache-status", "exists": audio_cache_exists(message.get("videoId"))})
                except (OSError, ValueError):
                    send({"type": "error", "error": "Could not check cached audio for this video."})
            elif message.get("type") == "clear-audio-cache":
                if thread and thread.is_alive():
                    send({"type": "error", "error": "Wait for the timing task to stop before removing audio."})
                    continue
                try:
                    removed = clear_audio_cache(message.get("videoId"))
                    send({"type": "audio-cache-cleared", "removed": removed})
                except (OSError, ValueError):
                    send({"type": "error", "error": "Could not remove the cached audio for this video."})
            elif message.get("type") == "cancel":
                if worker:
                    worker.cancelled.set()
            elif message.get("type") == "start":
                if thread and thread.is_alive():
                    send({"type": "error", "error": "A task is already running."})
                    continue
                validate_request(message)
                worker = Worker(message)
                thread = threading.Thread(target=worker.run)
                thread.start()
            else:
                send({"type": "error", "error": "Unknown native request."})
    except (ValueError, OSError):
        pass
    finally:
        if worker:
            worker.cancelled.set()
        if thread:
            thread.join()

if __name__ == "__main__":
    main()
