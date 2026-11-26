import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'mcp'))
spec = importlib.util.spec_from_file_location('karaoke_mcp', ROOT / 'mcp/server.py')
mcp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mcp)


def project():
    return {'videoId': 'abcdefghijk', 'videoUrl': 'https://www.youtube.com/watch?v=abcdefghijk', 'videoTitle': 'Live', 'title': 'Live', 'artist': '', 'originalLanguage': 'ja', 'translationLanguage': 'en', 'offset': 1, 'display': {}, 'source': None, 'furiganaEnabled': True, 'blocks': [{'id': 'a', 'start': 2, 'end': 3, 'text': '海', 'translations': {'en': 'Sea'}}]}


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = {'project': project(), 'revision': 4, 'targetLanguage': 'en'}
        self.calls = []
        def bridge(operation, **args):
            self.calls.append(operation)
            if operation == 'read':
                return copy.deepcopy(self.state)
            if operation == 'validate':
                return args['project']
            if operation == 'apply':
                if args['revision'] != self.state['revision']:
                    raise ValueError('Project changed')
                self.state.update(project=args['project'], revision=args['revision'] + 1)
                return self.state
            if operation == 'publication-review':
                return {'target': {'repo': 'example/catalog', 'branch': 'main'}, 'files': [{'file': 'en.json'}], 'sha': 'head'}
            if operation == 'publish':
                return {'revision': 'new-head'}
            raise AssertionError(operation)
        self.server = mcp.Server(Path(self.temp.name), bridge)

    def tearDown(self):
        self.server.pool.shutdown()
        self.temp.cleanup()

    def stage(self):
        proposal = copy.deepcopy(self.state['project'])
        proposal['blocks'][0]['text'] = '空'
        proposal['blocks'][0]['translations']['en'] = 'Sky'
        proposal['blocks'].append({'id': 'new', 'start': 4, 'end': 5, 'text': '声', 'translations': {'en': 'Voice'}})
        return self.server.handle('stage_lyrics', {'videoId': proposal['videoId'], 'expectedRevision': 4, 'project': proposal})

    def test_stage_is_read_only_and_table_includes_missing_lines_translation_offset(self):
        review = self.stage()
        self.assertNotIn('apply', self.calls)
        self.assertEqual(self.state['project']['blocks'][0]['text'], '海')
        self.assertIn('| 0:03.000–0:04.000 |', review['table'])
        self.assertIn('Sea', review['table']); self.assertIn('Sky', review['table'])
        self.assertIn('| — | 声', review['table'])
        self.assertEqual(self.server.load(review['reviewId'])['before'], self.state['project'])

    def test_apply_stale_replay_and_separate_publication(self):
        review = self.stage(); args = {'reviewId': review['reviewId']}
        with self.assertRaisesRegex(ValueError, 'Apply'):
            self.server.handle('prepare_publication', args)
        self.state['revision'] += 1
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.server.handle('apply_lyrics', args)
        self.state['revision'] = 4
        self.server.handle('apply_lyrics', args)
        self.assertNotIn('publish', self.calls)
        with self.assertRaisesRegex(ValueError, 'already applied'):
            self.server.handle('apply_lyrics', args)
        with self.assertRaisesRegex(ValueError, 'Prepare publication'):
            self.server.handle('publish_lyrics', {**args, 'publicationId': str(mcp.uuid.uuid4())})
        prepared = self.server.handle('prepare_publication', args)
        published = self.server.handle('publish_lyrics', {**args, 'publicationId': prepared['publicationId']})
        self.assertEqual(published['commitUrl'], 'https://github.com/example/catalog/commit/new-head')

    def test_cleanup_is_scoped_and_retains_recovery_without_audio_if_declined(self):
        review = self.stage(); args = {'reviewId': review['reviewId']}
        self.server.handle('apply_lyrics', args)
        with patch.object(mcp.helper, 'clear_audio_cache') as clear:
            result = self.server.handle('cleanup', {**args, 'includeAudio': False})
            clear.assert_not_called()
        recovery = json.loads(Path(result['recoveryFile']).read_text())
        self.assertEqual(recovery['before']['blocks'][0]['text'], '海')
        self.assertEqual(recovery['after']['blocks'][0]['text'], '空')
        self.assertNotIn('table', recovery)
        with self.assertRaises(ValueError):
            self.server.handle('get_review', {'reviewId': '../outside'})

    def test_missing_translation_or_changed_display_is_rejected(self):
        for change in ('translation', 'display'):
            proposal = copy.deepcopy(self.state['project'])
            if change == 'translation':
                proposal['blocks'][0]['translations'] = {}
            else:
                proposal['display'] = {'position': 42}
            with self.assertRaises(ValueError):
                self.server.handle('stage_lyrics', {'videoId': proposal['videoId'], 'expectedRevision': 4, 'project': proposal})

    def test_diff_covers_deletion_timing_and_ruby_only_changes(self):
        before = project(); after = copy.deepcopy(before)
        after['blocks'][0]['start'] = 1
        after['blocks'][0]['furigana'] = [['海', 'うみ']]
        rows, table = mcp.difference(before, after)
        self.assertEqual(len(rows), 1); self.assertIn('→ 0:02.000', table); self.assertIn('Ruby:', table)
        after['blocks'] = []
        rows, table = mcp.difference(before, after)
        self.assertEqual(rows[0]['kind'], 'removed'); self.assertIn('| — |', table)

    def sweep(self):
        proposal = copy.deepcopy(self.state['project'])
        proposal['blocks'][0]['sweep'] = [{'text': '海', 'start': 2, 'end': 3}]
        return self.server.handle('stage_sweep', {'videoId': proposal['videoId'], 'expectedRevision': self.state['revision'], 'project': proposal})

    def test_sweep_stage_apply_backup_and_stale_protection(self):
        review = self.sweep()
        self.assertNotIn('apply', self.calls)
        self.assertIn('Sweep: 海 [0:03.000–0:04.000]', review['table'])
        with self.assertRaisesRegex(ValueError, 'matching'):
            self.server.handle('apply_lyrics', {'reviewId': review['reviewId']})
        self.state['revision'] += 1
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.server.handle('apply_sweep', {'reviewId': review['reviewId']})
        self.state['revision'] -= 1
        applied = self.server.handle('apply_sweep', {'reviewId': review['reviewId']})
        self.assertEqual(self.state['project']['blocks'][0]['sweep'], review['after']['blocks'][0]['sweep'])
        self.assertEqual(json.loads(Path(applied['backup']).read_text())['before'], review['before'])
        self.assertEqual(self.server.handle('apply_sweep', {'reviewId': review['reviewId']})['status'], 'unchanged')
        self.state['revision'] += 1
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.server.handle('apply_sweep', {'reviewId': review['reviewId']})

    def test_sweep_creates_subtitles_and_translation_when_none_exist(self):
        self.state['project']['blocks'] = []
        proposed = copy.deepcopy(self.state['project'])
        proposed['blocks'] = [{'id': 'new', 'text': '海', 'start': 2, 'end': 3,
                               'translations': {'en': 'Sea'}, 'sweep': [{'text': '海', 'start': 2, 'end': 3}]}]
        review = self.server.handle('stage_sweep', {'videoId': proposed['videoId'], 'expectedRevision': 4, 'project': proposed})
        self.server.handle('apply_sweep', {'reviewId': review['reviewId']})
        self.assertEqual(self.state['project']['blocks'][0]['translations']['en'], 'Sea')

    def test_sweep_can_correct_wrong_existing_lyrics_and_translation(self):
        proposed = self.sweep()['after']
        proposed['blocks'][0].update(text='空', translations={'en': 'Sky'}, sweep=[{'text': '空', 'start': 2, 'end': 3}])
        review = self.server.handle('stage_sweep', {'videoId': proposed['videoId'], 'expectedRevision': 4, 'project': proposed, 'notes': 'Corrected words to match recording.'})
        self.server.handle('apply_sweep', {'reviewId': review['reviewId']})
        self.assertEqual(self.state['project']['blocks'][0]['text'], '空')

    def test_identical_sweep_is_a_noop_without_writes_or_reviews(self):
        review = self.sweep()
        self.server.handle('apply_sweep', {'reviewId': review['reviewId']})
        files = list(Path(self.temp.name).iterdir())
        applies = self.calls.count('apply')
        for _ in range(2):
            result = self.server.handle('stage_sweep', {'videoId': self.state['project']['videoId'], 'expectedRevision': 5, 'project': copy.deepcopy(self.state['project'])})
            self.assertEqual(result['status'], 'unchanged')
            self.assertNotIn('reviewId', result)
        self.assertEqual(self.state['revision'], 5)
        self.assertEqual(self.calls.count('apply'), applies)
        self.assertEqual(list(Path(self.temp.name).iterdir()), files)

    def test_sweep_requires_translation_coverage_and_times_within_video(self):
        for change in ('translation', 'offset', 'missing', 'duration'):
            proposed = self.sweep()['after']
            if change == 'translation': proposed['blocks'][0]['translations'] = {}
            if change == 'offset': proposed['offset'] = 0
            if change == 'missing': del proposed['blocks'][0]['sweep']
            if change == 'duration': self.state['duration'] = 3
            with self.assertRaises(ValueError):
                self.server.handle('stage_sweep', {'videoId': proposed['videoId'], 'expectedRevision': 4, 'project': proposed})

    def test_partial_sweep_reports_unswept_lines_without_inventing_timing(self):
        proposed = self.sweep()['after']
        proposed['blocks'].append({'id': 'uncertain', 'text': '声', 'start': 4, 'end': 5, 'translations': {'en': 'Voice'}})
        review = self.server.handle('stage_sweep', {'videoId': proposed['videoId'], 'expectedRevision': 4, 'project': proposed})
        self.assertEqual(review['coverage'], {'sungLines': 2, 'sweptLines': 1, 'unsweptIds': ['uncertain']})

    def test_audio_cache_reused_without_downloading_or_paid_calls(self):
        audio = Path(self.temp.name) / 'cached.mp3'; audio.write_bytes(b'fixture')
        class Worker:
            def __init__(self, *args, **kwargs): pass
            def prepare_audio(self, folder): return audio
            def cached_audio_path(self): return audio
        self.server.jobs['abcdefghijk'] = {'status': 'running'}
        with patch.object(mcp.helper, 'Worker', Worker):
            self.server.audio_job('abcdefghijk', 20)
        self.assertEqual(self.server.jobs['abcdefghijk']['status'], 'ready')


class ProtocolTests(unittest.TestCase):
    def test_dependency_check_returns_installation_guidance_only_when_missing(self):
        with tempfile.TemporaryDirectory() as temporary:
            server = mcp.Server(Path(temporary))
            try:
                for ready in (True, False):
                    status = {'ready': ready, 'dependencies': {'FFmpeg': {'available': ready}}}
                    with patch.object(mcp.helper, 'status', return_value=status), patch.object(mcp.subprocess, 'run', return_value=type('Result', (), {'stdout': 'Verified install command'})()) as command:
                        result = server.handle('check_dependencies', {})
                    self.assertEqual(result['missing'], [] if ready else ['FFmpeg'])
                    if ready:
                        command.assert_not_called()
                        self.assertIsNone(result['installationInstructions'])
                    else:
                        self.assertEqual(result['installationInstructions'], 'Verified install command')
                        self.assertEqual(command.call_args.args[0][-1], '--check')
            finally:
                server.pool.shutdown()

    def test_translation_tools_forward_validated_arguments_without_credentials(self):
        calls = []
        with tempfile.TemporaryDirectory() as temporary:
            server = mcp.Server(Path(temporary), lambda operation, **args: calls.append((operation, args)) or {'status': 'running'})
            try:
                server.handle('start_translation', {'videoId': 'abcdefghijk', 'includeFurigana': False})
                job_id = str(mcp.uuid.uuid4())
                server.handle('translation_status', {'videoId': 'abcdefghijk', 'jobId': job_id})
                self.assertEqual(calls, [('start-translation', {'videoId': 'abcdefghijk', 'includeFurigana': False}), ('translation-status', {'videoId': 'abcdefghijk', 'jobId': job_id})])
                for args in ({'videoId': 'abcdefghijk', 'convertRomaji': 1}, {'videoId': 'abcdefghijk', 'apiKey': 'secret'}):
                    with self.assertRaises(ValueError):
                        server.handle('start_translation', args)
                self.assertEqual(len(calls), 2)
            finally:
                server.pool.shutdown()

    def test_bridge_directory_matches_desktop_without_xdg_environment(self):
        import os
        import bridge
        runtime = Path(f'/run/user/{os.getuid()}')
        if not runtime.is_dir():
            self.skipTest('Linux user runtime directory unavailable')
        with patch.dict(os.environ, {'XDG_RUNTIME_DIR': str(runtime)}):
            desktop = bridge.directory()
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(bridge.directory(), desktop)

    def test_installer_replaces_symlinks_without_overwriting_targets(self):
        import os
        with tempfile.TemporaryDirectory() as temporary:
            home=Path(temporary)
            root=home/'.local/share/runrun-karaoke-mcp';root.mkdir(parents=True,mode=0o700)
            manifest=home/'.mozilla/native-messaging-hosts/com.runrun.karaoke.mcp.json';manifest.parent.mkdir(parents=True)
            outside=home/'keep';outside.write_text('preserve')
            (root/'bridge').symlink_to(outside);manifest.symlink_to(outside)
            subprocess.run([sys.executable,str(ROOT/'mcp/install.py')],env={**os.environ,'HOME':temporary},check=True,capture_output=True)
            self.assertEqual(outside.read_text(),'preserve')
            self.assertFalse((root/'bridge').is_symlink());self.assertFalse(manifest.is_symlink())
            self.assertEqual((root/'bridge').stat().st_mode & 0o777,0o700)
            self.assertEqual(manifest.stat().st_mode & 0o777,0o600)

    def test_stdio_initialization_tools_and_invalid_method(self):
        messages = [
            {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'protocolVersion': '2025-06-18'}},
            {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
            {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'},
            {'jsonrpc': '2.0', 'id': 3, 'method': 'missing'},
            {'jsonrpc': '2.0', 'id': 4, 'method': 'tools/call', 'params': {'name': 'get_project', 'arguments': {'videoId': '../invalid'}}},
        ]
        result = subprocess.run([sys.executable, str(ROOT / 'mcp/server.py')], input='\n'.join(map(json.dumps, messages)) + '\n', text=True, capture_output=True, check=True)
        replies = list(map(json.loads, result.stdout.splitlines()))
        self.assertEqual(len(replies), 4)
        self.assertEqual(replies[0]['result']['protocolVersion'], '2025-06-18')
        self.assertIn('listen_audio', [tool['name'] for tool in replies[1]['result']['tools']])
        self.assertEqual(replies[2]['error']['code'], -32601)
        self.assertTrue(replies[3]['result']['isError'])


if __name__ == '__main__':
    unittest.main()
