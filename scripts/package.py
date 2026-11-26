"""Build the public distribution and retain the three newest release archives."""
from pathlib import Path
import argparse
import json
import re
import tempfile
import zipfile


def prune_distributions(directory):
    releases = []
    for path in directory.iterdir():
        match = re.fullmatch(r"runrun-karaoke-(\d+(?:\.\d+)*)(-local)?\.zip", path.name)
        if not match or not path.is_file() or path.is_symlink():
            continue
        if match[2]:
            path.unlink()
        else:
            releases.append((tuple(map(int, match[1].split("."))), path))
    for _, path in sorted(releases, reverse=True)[3:]:
        path.unlink()


def build(root):
    manifest = json.loads((root / "manifest.json").read_text())
    version = manifest["version"]
    output = root / "dist" / f"runrun-karaoke-{version}.zip"
    output.parent.mkdir(exist_ok=True)
    # Publish complete archives before removing any older distributions.
    with tempfile.TemporaryDirectory(prefix=".package-", dir=output.parent) as temporary:
        helper = Path(temporary) / "native-helper.zip"
        with zipfile.ZipFile(helper, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in ["helper.py", "install.py", "install.sh", "README.md"]:
                archive.write(root / "native" / name, name)
        staged = Path(temporary) / output.name
        with zipfile.ZipFile(staged, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in [root / "manifest.json", root / "LICENSE", root / "privacy.md"]:
                archive.write(path, path.relative_to(root))
            archive.write(helper, "native-helper.zip")
            for path in sorted((root / "src").glob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(root))
        helper.replace(root / "native-helper.zip")
        staged.replace(output)
    prune_distributions(output.parent)
    return output


if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
    print(build(Path(__file__).resolve().parents[1]))
