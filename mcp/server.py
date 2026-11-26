#!/usr/bin/env python3
"""RunRun karaoke MCP stdio server. No third-party Python dependencies."""
import base64
from concurrent.futures import ThreadPoolExecutor
import html
import json
import math
import os
from pathlib import Path
import re
import socket
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'native'))
import helper
from bridge import directory, LIMIT

ID = {'type': 'string', 'pattern': '^[A-Za-z0-9_-]{11}$'}
REVIEW = {'type': 'string', 'format': 'uuid'}
TOOLS = []


def tool(name, description, properties=None, required=None, read_only=False, destructive=False):
    TOOLS.append({'name': name, 'description': description,
                  'inputSchema': {'type': 'object', 'properties': properties or {}, 'required': required or [], 'additionalProperties': False},
                  'annotations': {'readOnlyHint': read_only, 'destructiveHint': destructive, 'openWorldHint': name in ('start_translation', 'prepare_audio', 'search_lyrics', 'prepare_publication', 'publish_lyrics')}})


tool('check_dependencies', 'Check local audio prerequisites without installing anything. Returns missing programs and verified distro installation instructions when needed. Run when invoking add-sweep before audio work.', read_only=True)
tool('list_videos', 'List open YouTube videos and durations from the connected Firefox extension.', read_only=True)
tool('get_project', 'Read saved lyrics, translations, target language, revision and live duration. Check hasLyrics before choosing correction or generation.', {'videoId': ID}, ['videoId'], True)
tool('start_translation', 'Start a paid OpenAI translation only when the user requests or authorizes it. Uses the saved API key/model and project target language; options default to saved preferences. Returns immediately; poll translation_status. Does not modify lyrics. Repeated calls while running reuse the existing job.', {'videoId': ID, 'includeFurigana': {'type': 'boolean'}, 'convertRomaji': {'type': 'boolean'}}, ['videoId'])
tool('translation_status', 'Read AI translation progress, validation errors or the completed proposed project. No new API request. Stage the completed project with stage_lyrics to review/apply it. Jobs are lost when the extension reloads.', {'videoId': ID, 'jobId': REVIEW}, ['videoId', 'jobId'], True)
tool('prepare_audio', 'Start/reuse full-video audio download and extraction, reusing the AudioShake cache. No paid API. Poll audio_status; does not change lyrics.', {'videoId': ID, 'duration': {'type': 'number', 'exclusiveMinimum': 0, 'maximum': 2700}}, ['videoId', 'duration'])
tool('audio_status', 'Read progress of audio preparation, including the cached file path when ready.', {'videoId': ID}, ['videoId'], True)
tool('listen_audio', 'Return an actual WAV audio content block for listening. Times are video seconds, not project-relative seconds. Listen across the complete track, including gaps; never infer performed lyrics solely from LRCLIB.', {'videoId': ID, 'start': {'type': 'number', 'minimum': 0}, 'seconds': {'type': 'number', 'exclusiveMinimum': 0, 'maximum': 30, 'default': 20}}, ['videoId', 'start'], True)
tool('search_lyrics', 'Search LRCLIB for the original song text as reference. A live recording may differ; audio is authoritative.', {'query': {'type': 'string', 'minLength': 1, 'maxLength': 500}}, ['query'], True)
tool('stage_lyrics', 'Save a proposal and return its review table; DOES NOT edit the extension. Pass the complete project with stable existing IDs, new IDs for missing lines, translations in its target language, and Japanese furigana. Show the table and wait for user approval before apply_lyrics.', {'videoId': ID, 'expectedRevision': {'type': 'integer', 'minimum': 0}, 'project': {'type': 'object'}, 'notes': {'type': 'string', 'maxLength': 20000}}, ['videoId', 'expectedRevision', 'project'])
tool('stage_sweep', 'Stage progressive highlighting without changing Firefox. Supply the complete project; each sung block has sweep: [{text,start,end}], in project seconds (video seconds minus offset), ordered without overlap, inside block start/end, concatenating exactly to block.text. Reuse correct lyrics, translations, IDs, ruby and sweep. Correct or create lyrics plus target-language translations when missing or wrong; explain corrections in notes. Preserve settings. An identical proposal returns status unchanged without a review or write. Reuse prepare_audio/listen_audio for evidence. Returns a reviewId for apply_sweep.', {'videoId': ID, 'expectedRevision': {'type': 'integer', 'minimum': 0}, 'project': {'type': 'object'}, 'notes': {'type': 'string', 'maxLength': 20000}}, ['videoId', 'expectedRevision', 'project'])
tool('apply_sweep', 'Apply an exact stage_sweep proposal when adding progressive highlighting is authorized. Rejects stale revisions, retains before/after recovery JSON and refreshes open editors. Does not publish or delete audio.', {'reviewId': REVIEW}, ['reviewId'])
tool('get_review', 'Recover a staged review and its exact old/new text and translation table.', {'reviewId': REVIEW}, ['reviewId'], True)
tool('apply_lyrics', 'Apply the exact staged proposal locally ONLY after the user approves the shown table. Preserves a backup, rejects stale reviews, and updates open editors. Does not publish.', {'reviewId': REVIEW}, ['reviewId'])
tool('prepare_publication', 'Read the exact GitHub repository, branch, files and revision for applied lyrics. Show these to the user and ask permission to publish. Does not publish.', {'reviewId': REVIEW}, ['reviewId'], True)
tool('publish_lyrics', 'Publish lyrics and translation ONLY after explicit user approval of prepare_publication. Never commits extension source. Rejects changed project or remote branch; verify returned commit.', {'reviewId': REVIEW, 'publicationId': REVIEW}, ['reviewId', 'publicationId'], destructive=True)
tool('cleanup', 'Only after separate user permission: remove this video audio cache if includeAudio is true, and this review temporary artifacts. Retain recovery JSON with before/after lyrics. Never delete other videos or arbitrary paths.', {'reviewId': REVIEW, 'includeAudio': {'type': 'boolean', 'default': True}}, ['reviewId'], destructive=True)


def bridge(operation, **arguments):
    request = json.dumps({'operation': operation, 'arguments': arguments}, ensure_ascii=False, allow_nan=False).encode() + b'\n'
    if len(request) > LIMIT:
        raise ValueError('Project too large for native messaging; reduce the review size.')
    with socket.socket(socket.AF_UNIX) as client:
        client.settimeout(85)
        try:
            client.connect(str(directory() / 'bridge.sock'))
        except OSError as error:
            raise RuntimeError('RunRun MCP bridge unavailable. Install mcp/install.py, reload the extension and open a YouTube video in Firefox.') from error
        client.sendall(request)
        with client.makefile('rb') as stream:
            raw = stream.readline(LIMIT + 1)
        if len(raw) > LIMIT:
            raise ValueError('Extension response too large.')
        result = json.loads(raw)
        if 'error' in result:
            raise RuntimeError(result['error'])
        return result['data']


def video_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]{11}', value):
        raise ValueError('Invalid video ID.')
    return value


def review_id(value):
    if not isinstance(value, str) or str(uuid.UUID(value)) != value:
        raise ValueError('Invalid review ID.')
    return value


def numeric(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Invalid time or duration.')
    return value


def write_json(path, data):
    with tempfile.NamedTemporaryFile('w', dir=path.parent, delete=False, encoding='utf-8') as file:
        tmp = Path(file.name)
        try:
            json.dump(data, file, ensure_ascii=False, allow_nan=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
            tmp.replace(path)
        finally:
            tmp.unlink(missing_ok=True)


def timestamp(value):
    if value is None:
        return 'untimed'
    sign = '-' if value < 0 else ''
    ms = round(abs(value) * 1000)
    return f'{sign}{ms // 60000}:{ms // 1000 % 60:02d}.{ms % 1000:03d}'


def difference(before, after):
    old = {row['id']: row for row in before['blocks']}
    new = {row['id']: row for row in after['blocks']}
    rows = []
    def entry(a, b):
        row = b or a
        offset = after['offset'] if b else before['offset']
        start = row['start'] + offset if row['start'] is not None else None
        end = row['end'] + offset if row['end'] is not None else None
        old_start = a['start'] + before['offset'] if a and a['start'] is not None else None
        old_end = a['end'] + before['offset'] if a and a['end'] is not None else None
        return {'id': row['id'], 'kind': 'added' if a is None else 'removed' if b is None else 'changed',
                'start': start, 'end': end, 'oldStart': old_start, 'oldEnd': old_end,
                'original': a, 'proposed': b}
    for row in after['blocks']:
        previous = old.get(row['id'])
        if previous != row or (previous and (before['offset'] != after['offset'] or before['translationLanguage'] != after['translationLanguage'])):
            rows.append(entry(previous, row))
    rows += [entry(row, None) for row in before['blocks'] if row['id'] not in new]
    rows.sort(key=lambda row: (row['start'] is None, row['start'] or 0))
    def cell(row, language, offset):
        if not row:
            return '—'
        def escape(value):
            return html.escape(value).replace('|', '&#124;').replace('\n', '<br>')
        result = escape(row['text']) + '<br><em>' + escape(row['translations'].get(language, '')) + '</em>'
        if row.get('furigana'):
            result += '<br>Ruby: ' + escape(' · '.join(f'{text} → {reading}' for text, reading in row['furigana'] if reading))
        if row.get('sweep'):
            result += '<br>Sweep: ' + escape(' · '.join(f"{part['text']} [{timestamp(part['start'] + offset)}–{timestamp(part['end'] + offset)}]" for part in row['sweep']))
        return result
    table = ['| Timestamp | Oorspronkelijke tekst + vertaling | Nieuwe tekst + vertaling |', '|---|---|---|']
    for row in rows:
        time = timestamp(row['start']) + ('–' + timestamp(row['end']) if row['end'] is not None else '')
        if row['kind'] == 'changed' and (row['oldStart'], row['oldEnd']) != (row['start'], row['end']):
            time = timestamp(row['oldStart']) + ('–' + timestamp(row['oldEnd']) if row['oldEnd'] is not None else '') + ' → ' + time
        table.append(f"| {time} | {cell(row['original'], before['translationLanguage'], before['offset'])} | {cell(row['proposed'], after['translationLanguage'], after['offset'])} |")
    return rows, '\n'.join(table)


class Server:
    def __init__(self, root=None, call=bridge):
        self.root = helper.private_directory(root or Path.home() / '.local/state/runrun-karaoke-mcp')
        self.call = call
        self.jobs = {}
        self.pool = ThreadPoolExecutor(max_workers=1)

    def load(self, identifier):
        path = self.root / (review_id(identifier) + '.json')
        if path.is_symlink():
            raise ValueError('Invalid review file.')
        return json.loads(path.read_text())

    def save(self, review):
        write_json(self.root / (review_id(review['reviewId']) + '.json'), review)

    def audio_job(self, identifier, duration):
        try:
            with tempfile.TemporaryDirectory(prefix='runrun-mcp-audio-') as folder:
                worker = helper.Worker({'videoId': identifier, 'duration': duration, 'requestId': str(uuid.uuid4())},
                                       emit=lambda message: self.jobs[identifier].update(stage=message.get('stage', 'preparing')))
                worker.prepare_audio(Path(folder))
                cached = worker.cached_audio_path()
                if not cached.is_file():
                    raise RuntimeError('Audio cache unavailable after preparation.')
                self.jobs[identifier].update(status='ready', path=str(cached), duration=duration)
        except Exception as error:
            self.jobs[identifier].update(status='error', error=str(error))

    def handle(self, name, args):
        definition = next((item for item in TOOLS if item['name'] == name), None)
        if not definition:
            raise ValueError('Unknown tool.')
        schema = definition['inputSchema']
        if not isinstance(args, dict) or set(args) - set(schema['properties']) or set(schema['required']) - set(args):
            raise ValueError('Invalid tool arguments.')
        identifier = video_id(args['videoId']) if 'videoId' in args else None
        if name == 'check_dependencies':
            result = helper.status()
            result['missing'] = [name for name, info in result['dependencies'].items() if not info['available']]
            result['installationInstructions'] = None
            if not result['ready']:
                installer = Path(__file__).resolve().parents[1] / 'native/install.sh'
                try:
                    checked = subprocess.run(['sh', str(installer), '--check'], capture_output=True, text=True, timeout=25)
                    result['installationInstructions'] = checked.stdout.strip() or 'See native/README.md for Python 3.10+, FFmpeg/ffprobe, yt-dlp and Deno installation.'
                except (OSError, subprocess.TimeoutExpired):
                    result['installationInstructions'] = 'See native/README.md for Python 3.10+, FFmpeg/ffprobe, yt-dlp and Deno installation; package availability could not be checked.'
            return result
        if name == 'list_videos':
            return self.call('list')
        if name == 'get_project':
            return self.call('read', videoId=identifier)
        if name == 'start_translation':
            options = {key: args[key] for key in ('includeFurigana', 'convertRomaji') if key in args}
            if any(type(value) is not bool for value in options.values()):
                raise ValueError('Translation options must be boolean.')
            return self.call('start-translation', videoId=identifier, **options)
        if name == 'translation_status':
            return self.call('translation-status', videoId=identifier, jobId=review_id(args['jobId']))
        if name == 'prepare_audio':
            duration = numeric(args['duration'], 0.001, 2700)
            if self.jobs.get(identifier, {}).get('status') == 'running':
                return self.jobs[identifier]
            self.jobs[identifier] = {'status': 'running', 'stage': 'checking cache'}
            self.pool.submit(self.audio_job, identifier, duration)
            return dict(self.jobs[identifier])
        if name == 'audio_status':
            return self.jobs.get(identifier, {'status': 'not_started', 'cached': helper.audio_cache_path(identifier, create=False).is_file()})
        if name == 'listen_audio':
            start = numeric(args['start'], 0, 2700)
            seconds = numeric(args.get('seconds', 20), 0.01, 30)
            path = helper.audio_cache_path(identifier, create=False)
            if path.is_symlink() or not path.is_file():
                raise ValueError('Prepare the audio first.')
            ffprobe, ffmpeg = shutil.which('ffprobe'), shutil.which('ffmpeg')
            if not ffprobe or not ffmpeg:
                raise ValueError('Install FFmpeg and FFprobe to listen to audio.')
            # Executables are resolved locally; paths and numeric bounds are validated above.
            duration = float(subprocess.run([ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], check=True, capture_output=True, text=True, timeout=15).stdout)  # noqa: S603
            if start >= duration:
                raise ValueError('Audio start is outside the recording.')
            data = subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-ss', str(start), '-i', str(path), '-t', str(min(seconds, duration-start)), '-ac', '1', '-ar', '24000', '-f', 'wav', 'pipe:1'], check=True, capture_output=True, timeout=30).stdout  # noqa: S603
            return {'content': [{'type': 'text', 'text': f'Video {identifier}; absolute video time {timestamp(start)}–{timestamp(min(start+seconds, duration))}.'}, {'type': 'audio', 'data': base64.b64encode(data).decode(), 'mimeType': 'audio/wav'}]}
        if name == 'search_lyrics':
            query = args['query']
            if not isinstance(query, str) or not 0 < len(query.strip()) <= 500:
                raise ValueError('Enter a song/artist search of up to 500 characters.')
            url = 'https://lrclib.net/api/search?' + urllib.parse.urlencode({'q': query})
            request = urllib.request.Request(url, headers={'User-Agent': 'RunRunKaraoke-MCP/1.0'})
            with urllib.request.build_opener(helper.NoRedirect).open(request, timeout=30) as response:
                raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise ValueError('LRCLIB response too large.')
            return {'url': url, 'results': json.loads(raw)[:10], 'note': 'Reference lyrics only; live audio may differ.'}
        if name in ('stage_lyrics', 'stage_sweep'):
            state = self.call('read', videoId=identifier)
            revision = args['expectedRevision']
            if type(revision) is not int or revision != state['revision']:
                raise ValueError('Project changed since inspection. Read it again before staging.')
            proposed = self.call('validate', project=args['project'])
            if proposed['videoId'] != identifier:
                raise ValueError('Proposal belongs to another video.')
            # Keep non-lyric settings outside this workflow; the entire diff must be reviewable.
            for field in ('videoTitle', 'videoUrl', 'display', 'source'):
                if proposed[field] != state['project'][field]:
                    raise ValueError(f'Preserve {field} when fixing lyrics.')
            if proposed['translationLanguage'] != state['targetLanguage']:
                raise ValueError('Use the currently configured target language.')
            previous = {row['id']: row for row in state['project']['blocks']}
            language = proposed['translationLanguage']
            for row in proposed['blocks']:
                old = previous.get(row['id'])
                needs_translation = old is None or old['text'] != row['text'] or old['translations'].get(language, '').strip()
                if row['text'].strip() and needs_translation and not row['translations'].get(language, '').strip():
                    raise ValueError('Include a target-language translation for each new/corrected lyric and preserve existing translations.')
            if name == 'stage_sweep':
                before = state['project']
                for field in ('title', 'artist', 'offset', 'furiganaEnabled'):
                    if proposed[field] != before[field]:
                        raise ValueError(f'Preserve {field} when adding sweep.')
                sung = [row for row in proposed['blocks'] if row['text'].strip()]
                if not sung or not any(row.get('sweep') for row in sung):
                    raise ValueError('Include sweep segments for at least one sung line.')
                duration = state.get('duration')
                for row in sung:
                    if not row.get('sweep'):
                        continue
                    if row['start'] + proposed['offset'] < 0 or (duration is not None and row['end'] + proposed['offset'] > duration + 0.05):
                        raise ValueError('Sweep timing falls outside the video.')
            rows, table = difference(state['project'], proposed)
            notes = args.get('notes', '')
            if not isinstance(notes, str) or len(notes) > 20000:
                raise ValueError('Invalid review notes.')
            if name == 'stage_sweep' and proposed == state['project']:
                return {'status': 'unchanged', 'videoId': identifier, 'revision': revision, 'rows': [], 'table': table}
            review = {'reviewId': str(uuid.uuid4()), 'videoId': identifier, 'revision': revision, 'before': state['project'],
                      'after': proposed, 'rows': rows, 'table': table, 'notes': notes, 'status': 'staged', 'kind': 'sweep' if name == 'stage_sweep' else 'lyrics',
                      'metadataChanges': {key: {'before': state['project'][key], 'after': proposed[key]} for key in ('title', 'artist', 'originalLanguage', 'offset', 'furiganaEnabled') if state['project'][key] != proposed[key]}}
            old_ids = [row['id'] for row in state['project']['blocks']]
            new_ids = [row['id'] for row in proposed['blocks']]
            shared = set(old_ids) & set(new_ids)
            if [key for key in old_ids if key in shared] != [key for key in new_ids if key in shared]:
                review['metadataChanges']['lineOrder'] = {'before': old_ids, 'after': new_ids}
            if name == 'stage_sweep':
                review['coverage'] = {'sungLines': len(sung), 'sweptLines': sum(bool(row.get('sweep')) for row in sung),
                                      'unsweptIds': [row['id'] for row in sung if not row.get('sweep')]}
            self.save(review)
            return review
        review = self.load(args['reviewId'])
        if name == 'get_review':
            return review
        if name in ('apply_lyrics', 'apply_sweep'):
            if (review.get('kind', 'lyrics') == 'sweep') != (name == 'apply_sweep'):
                raise ValueError('Use the apply tool matching the staged proposal kind.')
            if name == 'apply_sweep' and review['status'] == 'applied':
                state = self.call('read', videoId=review['videoId'])
                if state['project'] != review['after'] or state['revision'] != review['appliedRevision']:
                    raise ValueError('Project changed after applying sweep. Read it again.')
                return {'status': 'unchanged', 'reviewId': review['reviewId'], 'revision': state['revision'], 'backup': str(self.root / (review['reviewId'] + '.json'))}
            if review['status'] != 'staged':
                raise ValueError('This proposal was already applied. Read the current project before another change.')
            saved = self.call('apply', project=review['after'], revision=review['revision'])
            review.update(status='applied', appliedRevision=saved['revision'])
            self.save(review)
            return {'reviewId': review['reviewId'], 'revision': saved['revision'], 'backup': str(self.root / (review['reviewId'] + '.json')), 'editorUpdates': saved.get('editorUpdates', [])}
        if name == 'prepare_publication':
            if review['status'] != 'applied':
                raise ValueError('Apply the approved lyrics before preparing publication.')
            publication = self.call('publication-review', videoId=review['videoId'], revision=review['appliedRevision'])
            review.update(publication=publication, publicationId=str(uuid.uuid4()))
            self.save(review)
            return {'publicationId': review['publicationId'], 'repository': publication['target'], 'files': publication['files'], 'branchRevision': publication['sha']}
        if name == 'publish_lyrics':
            if review['status'] != 'applied' or not review.get('publicationId') or args['publicationId'] != review['publicationId']:
                raise ValueError('Prepare publication and obtain permission for that destination first.')
            result = self.call('publish', videoId=review['videoId'], review=review['publication'])
            review.update(status='published', publicationResult=result)
            self.save(review)
            source = review['publication']['target']
            return {**result, 'commitUrl': f"https://github.com/{source['repo']}/commit/{result['revision']}"}
        if name == 'cleanup':
            include = args.get('includeAudio', True)
            if type(include) is not bool:
                raise ValueError('includeAudio must be boolean.')
            if review['status'] not in ('applied', 'published'):
                raise ValueError('Finish applying or explicitly discard the review before cleanup.')
            if self.jobs.get(review['videoId'], {}).get('status') == 'running':
                raise ValueError('Wait for audio preparation to finish.')
            removed = helper.clear_audio_cache(review['videoId']) if include else False
            # Keep before/after recovery data, remove derived table and publication preparation.
            backup = {'reviewId': review['reviewId'], 'videoId': review['videoId'], 'before': review['before'], 'after': review['after'], 'status': 'cleaned', 'publicationResult': review.get('publicationResult')}
            self.save(backup)
            return {'audioRemoved': removed, 'recoveryFile': str(self.root / (review['reviewId'] + '.json'))}
        raise ValueError('Unknown tool.')


def main():
    server = Server()
    for raw in sys.stdin.buffer:
        request = None
        try:
            if len(raw) > 4_000_000:
                raise ValueError('Request too large.')
            request = json.loads(raw)
            if not isinstance(request, dict) or request.get('jsonrpc') != '2.0':
                raise ValueError('Invalid JSON-RPC request.')
            if 'id' not in request:
                continue
            method = request.get('method')
            if method == 'initialize':
                requested = request.get('params', {}).get('protocolVersion')
                version = requested if requested in ('2024-11-05', '2025-03-26', '2025-06-18') else '2025-06-18'
                result = {'protocolVersion': version, 'capabilities': {'tools': {}}, 'serverInfo': {'name': 'runrun-karaoke', 'version': '1.0.0'}}
            elif method == 'ping':
                result = {}
            elif method == 'tools/list':
                result = {'tools': TOOLS}
            elif method == 'tools/call':
                try:
                    params = request.get('params', {})
                    value = server.handle(params.get('name'), params.get('arguments', {}))
                    result = value if isinstance(value, dict) and 'content' in value else {'content': [{'type': 'text', 'text': json.dumps(value, ensure_ascii=False, allow_nan=False)}]}
                except Exception as error:
                    result = {'content': [{'type': 'text', 'text': str(error)}], 'isError': True}
            else:
                print(json.dumps({'jsonrpc': '2.0', 'id': request['id'], 'error': {'code': -32601, 'message': 'Method not found'}}), flush=True)
                continue
            print(json.dumps({'jsonrpc': '2.0', 'id': request['id'], 'result': result}, ensure_ascii=False, allow_nan=False), flush=True)
        except Exception as error:
            print(json.dumps({'jsonrpc': '2.0', 'id': request.get('id') if isinstance(request, dict) else None, 'error': {'code': -32600, 'message': str(error)}}), flush=True)
    server.pool.shutdown(wait=True)


if __name__ == '__main__':
    main()
