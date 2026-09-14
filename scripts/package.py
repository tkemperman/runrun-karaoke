"""Package runtime files and license; exclude research downloads and local projects."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "manifest.json").read_text())["version"]
output = root / "dist" / f"runrun-karaoke-{version}.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in [root / "manifest.json", root / "LICENSE", root / "privacy.md", *sorted((root / "src").glob("*"))]:
        if path.is_file():
            archive.write(path, path.relative_to(root))
print(output)
