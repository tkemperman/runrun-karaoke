#!/usr/bin/env python3
"""Private Unix socket <-> Firefox native messaging, with no HTTP listener."""
import fcntl
import json
import os
from pathlib import Path
import socket
import struct
import sys
import tempfile

LIMIT = 950_000


def directory():
    # Desktop Firefox has XDG_RUNTIME_DIR; an MCP client launched elsewhere may not.
    # Resolve the same per-user runtime directory in both processes on Linux.
    runtime = Path(f'/run/user/{os.getuid()}')
    if not runtime.is_dir():
        runtime = Path(tempfile.gettempdir())
    path = Path(os.environ.get('XDG_RUNTIME_DIR') or runtime) / f'runrun-karaoke-mcp-{os.getuid()}'
    path.mkdir(mode=0o700, exist_ok=True)
    info = path.lstat()
    if path.is_symlink() or not path.is_dir() or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError('MCP socket directory must be private and owned by this user.')
    return path


def read_exact(stream, length):
    result = bytearray()
    while len(result) < length:
        part = stream.read(length - len(result))
        if not part:
            raise EOFError('Firefox disconnected.')
        result.extend(part)
    return bytes(result)


def main():
    root = directory()
    with (root / 'bridge.lock').open('a') as lock:
        # A second Firefox profile must not steal the existing connection.
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        path = root / 'bridge.sock'
        path.unlink(missing_ok=True)
        with socket.socket(socket.AF_UNIX) as listener:
            listener.bind(str(path))
            path.chmod(0o600)
            listener.listen(4)
            try:
                while True:
                    # Watch stdin too, so the host exits when Firefox closes its port.
                    import select
                    readable, _, _ = select.select([listener, sys.stdin.buffer], [], [])
                    if sys.stdin.buffer in readable:
                        break
                    connection, _ = listener.accept()
                    with connection:
                        connection.settimeout(90)
                        _, uid, _ = struct.unpack('3i', connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
                        if uid != os.getuid():
                            continue
                        with connection.makefile('rb') as stream:
                            raw = stream.readline(LIMIT + 1)
                        if len(raw) > LIMIT or not raw.endswith(b'\n'):
                            connection.sendall(b'{"error":"Request too large or incomplete."}\n')
                            continue
                        message = json.loads(raw)
                        data = json.dumps(message, ensure_ascii=False, allow_nan=False).encode()
                        sys.stdout.buffer.write(struct.pack('@I', len(data)) + data)
                        sys.stdout.buffer.flush()
                        size = struct.unpack('@I', read_exact(sys.stdin.buffer, 4))[0]
                        if size > LIMIT:
                            raise ValueError('Extension response too large.')
                        response = read_exact(sys.stdin.buffer, size)
                        connection.sendall(response + b'\n')
            finally:
                path.unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        main()
    except (EOFError, BrokenPipeError, ConnectionResetError):
        pass
