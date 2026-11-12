import importlib.util
import io
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("helper", "native/helper.py")
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)

class HelperTests(unittest.TestCase):
    def request(self, **patches):
        return dict(type="start", requestId="12345678-1234-1234-1234-123456789abc", videoId="F-iI4-BkwXg", duration=50, apiKey="secret", language="auto", **patches)

    def test_protocol_and_validation(self):
        value=self.request(); data=json.dumps(value).encode()
        self.assertEqual(H.read_message(io.BytesIO(struct.pack('@I',len(data))+data)),value)
        for data in [b'aa',struct.pack('@I',1000001),struct.pack('@I',4)+b'{}']:
            with self.assertRaises(ValueError): H.read_message(io.BytesIO(data))
        for key,value in [('duration',float('nan')),('duration',2701),('duration',True),('videoId','bad'),('language','Japanese'),('transcript',''),('apiKey','a\nb')]:
            request=self.request();request[key]=value
            with self.assertRaises(ValueError):H.validate_request(request)

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
                events=[];worker=H.Worker(self.request(transcript=transcript),events.append,state)
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

    def test_cancel_stops_before_api(self):
        events=[];worker=H.Worker(self.request(),events.append)
        worker.cancelled.set()
        with patch.object(worker,'submit',side_effect=H.Cancelled):worker.run()
        self.assertEqual(events[-1]['type'],'cancelled')

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
