import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile


spec = importlib.util.spec_from_file_location(
    "distribution_package", Path(__file__).resolve().parents[1] / "scripts/package.py")
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for directory in ["native", "src", "dist"]:
            (self.root / directory).mkdir()
        (self.root / "manifest.json").write_text(json.dumps({"version": "2.0.0"}))
        for name in ["LICENSE", "privacy.md", "src/example.js", "native/helper.py",
                     "native/install.py", "native/install.sh", "native/README.md"]:
            (self.root / name).write_text(name)

    def test_public_build_preserves_manifest_runtime_and_nested_helper(self):
        output = package.build(self.root)
        self.assertEqual(output.name, "runrun-karaoke-2.0.0.zip")
        with zipfile.ZipFile(output) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(set(archive.namelist()), {
                "manifest.json", "LICENSE", "privacy.md", "src/example.js", "native-helper.zip"})
            for name in ["manifest.json", "LICENSE", "privacy.md", "src/example.js"]:
                self.assertEqual(archive.read(name), (self.root / name).read_bytes())
            with zipfile.ZipFile(io.BytesIO(archive.read("native-helper.zip"))) as helper:
                for name in helper.namelist():
                    self.assertEqual(helper.read(name), (self.root / "native" / name).read_bytes())
        package.build(self.root)
        self.assertEqual(list((self.root / "dist").iterdir()), [output])

    def test_keeps_three_numeric_versions_and_removes_only_release_archives(self):
        dist = self.root / "dist"
        for version in ["1.8.0", "1.9.0", "1.10.0", "2.0.0"]:
            for suffix in ["", "-local"]:
                (dist / f"runrun-karaoke-{version}{suffix}.zip").write_bytes(b"old archive")
        unrelated = ["notes.txt", "other-1.0.0.zip", "runrun-karaoke-backup.zip"]
        for name in unrelated:
            (dist / name).write_bytes(b"keep")
        package.build(self.root)
        self.assertEqual({p.name for p in dist.iterdir()}, set(unrelated) | {
            "runrun-karaoke-1.9.0.zip", "runrun-karaoke-1.10.0.zip", "runrun-karaoke-2.0.0.zip"})
        for name in unrelated:
            self.assertEqual((dist / name).read_bytes(), b"keep")

    def test_failed_build_keeps_previous_archives_and_helper(self):
        dist = self.root / "dist"
        for name in ["1.0.0", "1.1.0", "1.2.0", "2.0.0", "2.0.0-local"]:
            (dist / f"runrun-karaoke-{name}.zip").write_bytes(name.encode())
        (self.root / "native-helper.zip").write_bytes(b"existing helper")
        before = {p.name: p.read_bytes() for p in dist.iterdir()}
        (self.root / "privacy.md").unlink()
        with self.assertRaises(FileNotFoundError):
            package.build(self.root)
        self.assertEqual({p.name: p.read_bytes() for p in dist.iterdir()}, before)
        self.assertEqual((self.root / "native-helper.zip").read_bytes(), b"existing helper")


if __name__ == "__main__":
    unittest.main()
