"""Package runtime files and license; exclude research downloads and local projects."""
from pathlib import Path
import argparse
import json
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("--local", action="store_true", help="build a local Firefox variant with a higher internal version")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text())
version = manifest["version"]
output = root / "dist" / f"runrun-karaoke-{version}{'-local' if args.local else ''}.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    if args.local:
        manifest["version"] = f"{version}.1"
        manifest["version_name"] = f"{version}-local"
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    else:
        archive.write(root / "manifest.json", "manifest.json")
    for path in [root / "LICENSE", root / "privacy.md", *sorted((root / "src").glob("*"))]:
        if path.is_file():
            archive.write(path, path.relative_to(root))
print(output)
