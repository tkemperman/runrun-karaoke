import importlib.util
import io
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("helper", "native/helper.py")
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)

class HelperTests(unittest.TestCase):
    def request(self, **patches):
        return dict(type="start", requestId="12345678-1234-1234-1234-123456789abc", videoId="F-iI4-BkwXg", duration=50, apiKey="secret", language="auto") | patches

    def test_protocol_and_validation(self):
        value=self.request(); data=json.dumps(value).encode()
        self.assertEqual(H.read_message(io.BytesIO(struct.pack('@I',len(data))+data)),value)
        for data in [b'aa',struct.pack('@I',1000001),struct.pack('@I',4)+b'null']:
            with self.assertRaises(ValueError): H.read_message(io.BytesIO(data))
        for key,value in [('duration',float('nan')),('duration',2701),('duration',True),('videoId','bad'),('requestId','-'*36),('language','Japanese'),('transcript',''),('apiKey','a\nb')]:
            request=self.request();request[key]=value
            with self.assertRaises(ValueError):H.validate_request(request)

    def test_receipts_require_private_storage_and_reject_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            state=Path(folder)/'state';state.mkdir(mode=0o755)
            worker=H.Worker(self.request(),lambda _:None,state)
            with self.assertRaises(OSError):worker.record({'taskId':'safe'})
            state.chmod(0o700);target=Path(folder)/'target';target.write_text('{"taskId":"stolen"}')
            worker.receipt.symlink_to(target)
            with self.assertRaises(OSError):worker.read_receipt()
            self.assertEqual(target.read_text(),'{"taskId":"stolen"}')

    def test_limited_json_rejects_oversized_responses(self):
        self.assertEqual(H.limited_json(io.BytesIO(b'{"ok":true}'),100,'Test'),{'ok':True})
        with self.assertRaises(RuntimeError):H.limited_json(io.BytesIO(b'12345'),4,'Test')

    def test_status_detects_missing_dependencies_without_keys(self):
        with patch.object(H.shutil,'which',return_value=None):
            result=H.status()
        self.assertFalse(result['ready']);self.assertEqual(result['protocol'],1)
        self.assertTrue(result['dependencies']['Python']['available'])
        self.assertNotIn('apiKey',json.dumps(result))

    def test_distribution_id_like(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'os-release';path.write_text('ID=endeavouros\nID_LIKE="arch"\nPRETTY_NAME="EndeavourOS"\n')
            self.assertEqual(H.distro(path)['ID_LIKE'],'arch')
        self.assertEqual(H.distro('/nonexistent'),{})

    def test_resume_never_submits_again(self):
        with tempfile.TemporaryDirectory() as folder:
            events=[];worker=H.Worker(self.request(),events.append,folder)
            worker.record({'taskId':'saved-task','videoId':'F-iI4-BkwXg'})
            with patch.object(worker,'submit') as submit,patch.object(worker,'poll') as poll:
                worker.run();submit.assert_not_called();poll.assert_called_once()
            self.assertEqual(worker.task_id,'saved-task');self.assertNotIn('apiKey',worker.message)

    def test_uncertain_submission_and_missing_resume_receipt_never_post(self):
        for receipt in [None,{'state':'submitting','videoId':'F-iI4-BkwXg'}]:
            with tempfile.TemporaryDirectory() as folder:
                events=[];worker=H.Worker(self.request(resume=True),events.append,folder)
                if receipt: worker.record(receipt)
                with patch.object(worker,'submit') as submit:
                    worker.run();submit.assert_not_called()
                self.assertEqual(events[-1]['type'],'error')
                self.assertNotIn('secret',json.dumps(events))

    def test_submission_with_and_without_transcript_and_temp_cleanup(self):
        for transcript in [None,'朝\n朝']:
            with tempfile.TemporaryDirectory() as state:
                events=[];worker=H.Worker(self.request(transcript=transcript),events.append,state,Path(state)/'cache')
                paths=[];payloads=[]
                def download(folder):
                    path=folder/'audio.mp3';path.write_bytes(b'audio');paths.append(path);return path
                def upload(path,mime):
                    if path.suffix=='.txt':
                        self.assertEqual(path.read_text(),'朝\n朝');self.assertIn('utf-8',mime)
                    return path.name
                def api(path,payload):
                    self.assertEqual(json.loads(worker.receipt.read_text())['state'],'submitting')
                    payloads.append(payload);return {'id':'task-1'}
                with patch.object(H,'status',return_value={'ready':True}),patch.object(worker,'download',side_effect=download),patch.object(worker,'upload',side_effect=upload),patch.object(worker,'api',side_effect=api):worker.submit()
                target=payloads[0]['targets'][0]
                self.assertEqual(target['model'],'alignment');self.assertEqual(target['formats'],['json']);self.assertNotIn('language',target)
                self.assertEqual('transcriptAssetId' in target,transcript is not None)
                self.assertFalse(paths[0].exists());self.assertEqual(json.loads(worker.receipt.read_text())['taskId'],'task-1')
                self.assertNotIn('secret',worker.receipt.read_text())
                cached=worker.cached_audio_path()
                self.assertEqual(cached.read_bytes(),b'audio')
                self.assertEqual(cached.stat().st_mode & 0o777,0o600)
                self.assertEqual(worker.cache_dir.stat().st_mode & 0o777,0o700)

    def test_retiming_reuses_audio_across_workers_and_uploads_current_lyrics(self):
        with tempfile.TemporaryDirectory() as state:
            cache=Path(state)/'cache'
            uploads=[];events=[]
            def download(folder):
                audio=folder/'audio.mp3';audio.write_bytes(b'complete track');return audio
            def upload(path,mime):
                uploads.append((path,path.read_bytes()));return path.name
            with patch.object(H,'status',return_value={'ready':True}),patch.object(H.Worker,'download',side_effect=download) as fetch,patch.object(H.Worker,'run_command',return_value='50') as probe,patch.object(H.Worker,'upload',side_effect=upload),patch.object(H.Worker,'api',return_value={'id':'task-1'}) as api:
                for i,lyrics in enumerate(['Intro\nVerse','Verse']):
                    worker=H.Worker(self.request(requestId=f'{i:08d}-1234-1234-1234-123456789abc',transcript=lyrics),events.append,state,cache)
                    worker.submit()
                self.assertEqual(fetch.call_count,1)
                self.assertEqual(probe.call_count,1)
                self.assertEqual(probe.call_args.args[0][0],'ffprobe')
                self.assertEqual(api.call_count,2)
            self.assertEqual([data for _,data in uploads],[b'complete track',b'Intro\nVerse',b'complete track',b'Verse'])
            self.assertTrue(all(not path.exists() for path,_ in uploads))
            self.assertEqual([p.name for p in cache.iterdir()],['F-iI4-BkwXg.mp3'])
            self.assertIn('reusing downloaded audio',[event.get('stage') for event in events])

    def test_missing_corrupt_and_wrong_duration_cache_download_again(self):
        for case in ['missing','empty','corrupt','wrong-duration','nan','different-video']:
            with self.subTest(case=case),tempfile.TemporaryDirectory() as state,tempfile.TemporaryDirectory() as job:
                worker=H.Worker(self.request(),lambda _:None,state,Path(state)/'cache')
                cached=worker.cached_audio_path()
                if case!='missing':
                    path=cached if case!='different-video' else cached.with_name('abcdefghijk.mp3')
                    path.write_bytes(b'' if case=='empty' else b'old audio')
                def download(folder):
                    self.assertFalse((folder/'audio.mp3').exists())
                    audio=folder/'audio.mp3';audio.write_bytes(b'new audio');return audio
                with patch.object(worker,'download',side_effect=download) as fetch,patch.object(worker,'run_command',return_value='100' if case=='wrong-duration' else 'nan',side_effect=RuntimeError('bad audio') if case=='corrupt' else None):
                    audio=worker.prepare_audio(Path(job))
                fetch.assert_called_once()
                self.assertEqual(audio.read_bytes(),b'new audio')
                self.assertEqual(cached.read_bytes(),b'new audio')

    def test_failed_or_cancelled_download_is_not_cached(self):
        for error in [RuntimeError('download failed'),H.Cancelled()]:
            with tempfile.TemporaryDirectory() as state,tempfile.TemporaryDirectory() as job:
                worker=H.Worker(self.request(),lambda _:None,state,Path(state)/'cache')
                def download(folder):
                    (folder/'audio.mp3').write_bytes(b'partial')
                    raise error
                with patch.object(worker,'download',side_effect=download):
                    with self.assertRaises(type(error)):worker.prepare_audio(Path(job))
                self.assertFalse(worker.cached_audio_path().exists())

    def test_cancel_during_cache_validation_does_not_download(self):
        with tempfile.TemporaryDirectory() as state,tempfile.TemporaryDirectory() as job:
            worker=H.Worker(self.request(),lambda _:None,state,Path(state)/'cache')
            worker.cached_audio_path().write_bytes(b'cached audio')
            with patch.object(worker,'run_command',side_effect=H.Cancelled),patch.object(worker,'download') as fetch:
                with self.assertRaises(H.Cancelled):worker.prepare_audio(Path(job))
                fetch.assert_not_called()

    def test_cache_write_failure_still_allows_upload(self):
        with tempfile.TemporaryDirectory() as state,tempfile.TemporaryDirectory() as job:
            worker=H.Worker(self.request(),lambda _:None,state,Path(state)/'cache')
            def download(folder):
                audio=folder/'audio.mp3';audio.write_bytes(b'complete');return audio
            with patch.object(worker,'download',side_effect=download),patch.object(H.shutil,'copyfile',side_effect=OSError('disk full')):
                audio=worker.prepare_audio(Path(job))
            self.assertEqual(audio.read_bytes(),b'complete')
            self.assertEqual(list(worker.cache_dir.iterdir()),[])

    def test_cancel_stops_before_api(self):
        events=[];worker=H.Worker(self.request(),events.append)
        worker.cancelled.set()
        with patch.object(worker,'submit',side_effect=H.Cancelled):worker.run()
        self.assertEqual(events[-1]['type'],'cancelled')

    def test_clear_audio_removes_only_selected_video_and_handles_absent_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            cache=Path(folder)/'cache'
            self.assertFalse(H.clear_audio_cache('F-iI4-BkwXg',cache))
            self.assertFalse(cache.exists())
            selected=H.audio_cache_path('F-iI4-BkwXg',cache);selected.write_bytes(b'audio')
            other=H.audio_cache_path('abcdefghijk',cache);other.write_bytes(b'other audio')
            receipt=Path(folder)/'receipt.json';receipt.write_text('{"taskId":"saved"}')
            for video_id in ['../bad',None,'../abcdefgh','',123]:
                with self.assertRaises(ValueError):H.clear_audio_cache(video_id,cache)
            self.assertTrue(selected.exists())
            self.assertTrue(H.clear_audio_cache('F-iI4-BkwXg',cache))
            self.assertFalse(H.clear_audio_cache('F-iI4-BkwXg',cache))
            self.assertEqual(other.read_bytes(),b'other audio')
            self.assertEqual(receipt.read_text(),'{"taskId":"saved"}')

    def test_clear_audio_rejects_symlinked_cache_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'target';target.mkdir(mode=0o700)
            audio=target/'F-iI4-BkwXg.mp3';audio.write_bytes(b'keep')
            cache=Path(folder)/'cache';cache.symlink_to(target,target_is_directory=True)
            with self.assertRaises(OSError):H.clear_audio_cache('F-iI4-BkwXg',cache)
            self.assertEqual(audio.read_bytes(),b'keep')

    def test_clear_audio_protocol_needs_no_credentials_or_dependencies(self):
        events=[]
        with patch.object(H,'read_message',side_effect=[{'type':'clear-audio-cache','videoId':'F-iI4-BkwXg'},None]),patch.object(H,'send',side_effect=events.append),patch.object(H,'clear_audio_cache',return_value=True) as clear,patch.object(H,'status') as status,patch.object(H,'Worker') as worker:
            H.main()
        clear.assert_called_once_with('F-iI4-BkwXg');status.assert_not_called();worker.assert_not_called()
        self.assertEqual(events,[{'type':'audio-cache-cleared','removed':True}])

    def test_install_prefers_pacman_and_checks_all_packages(self):
        with tempfile.TemporaryDirectory() as folder:
            bin=Path(folder);log=bin/'calls';pacman=bin/'pacman'
            pacman.write_text(f'#!/bin/sh\necho "$*" >> "{log}"\nexit 0\n');pacman.chmod(0o755)
            import os
            env={**os.environ,'PATH':str(bin)+':'+os.environ['PATH']}
            result=subprocess.run(['sh','native/install.sh','--distro','arch','--check'],capture_output=True,text=True,env=env)
            self.assertEqual(result.returncode,0);self.assertIn('sudo pacman -S --needed python ffmpeg yt-dlp deno',result.stdout)
            self.assertEqual(log.read_text().count('-Si'),4)
            pacman.write_text('#!/bin/sh\nexit 1\n')
            result=subprocess.run(['sh','native/install.sh','--distro','arch','--check'],capture_output=True,text=True,env=env)
            self.assertNotIn('sudo pacman',result.stdout)
            result=subprocess.run(['sh','native/install.sh','--distro','unknown','--check'],capture_output=True,text=True,env=env)
            self.assertNotIn('sudo ',result.stdout)

    def test_user_installer_uses_private_atomic_files(self):
        import os
        with tempfile.TemporaryDirectory() as folder:
            home=Path(folder)/'home';home.mkdir()
            env={**os.environ,'HOME':str(home)}
            command=[sys.executable,'native/install.py']
            subprocess.run(command,check=True,capture_output=True,text=True,env=env)
            target=home/'.local/share/runrun-karaoke-helper'
            helper=target/'helper.py';launcher=target/'run-helper'
            manifest=home/'.mozilla/native-messaging-hosts/com.runrun.karaoke.json'
            self.assertEqual(target.stat().st_mode & 0o777,0o700)
            self.assertEqual(helper.stat().st_mode & 0o777,0o600)
            self.assertEqual(launcher.stat().st_mode & 0o777,0o700)
            self.assertEqual(manifest.stat().st_mode & 0o777,0o600)
            sentinel=home/'sentinel';sentinel.write_text('unchanged')
            helper.unlink();helper.symlink_to(sentinel)
            subprocess.run(command,check=True,capture_output=True,text=True,env=env)
            self.assertFalse(helper.is_symlink())
            self.assertEqual(sentinel.read_text(),'unchanged')

    def test_other_distribution_package_checks(self):
        import os
        for family, manager, output, expected in [
            ('debian', 'apt-cache', 'Package: available', 'sudo apt install python3 ffmpeg yt-dlp deno'),
            ('fedora', 'dnf', 'available-package', 'sudo dnf install python3 ffmpeg-free yt-dlp deno'),
            ('opensuse', 'zypper', ' | python3 | \n | ffmpeg | \n | yt-dlp | \n | deno | ', 'sudo zypper install python3 ffmpeg yt-dlp deno')]:
            with tempfile.TemporaryDirectory() as folder:
                command=Path(folder)/manager
                command.write_text("#!/bin/sh\nprintf '%s\\n' '"+output+"'\n")
                command.chmod(0o755)
                env={**os.environ, 'PATH':folder+':'+os.environ['PATH']}
                result=subprocess.run(['sh','native/install.sh','--distro',family,'--check'],capture_output=True,text=True,env=env)
                self.assertIn(expected,result.stdout)
                command.write_text('#!/bin/sh\nexit 1\n')
                result=subprocess.run(['sh','native/install.sh','--distro',family,'--check'],capture_output=True,text=True,env=env)
                self.assertNotIn('sudo ',result.stdout)

if __name__=='__main__':unittest.main()
