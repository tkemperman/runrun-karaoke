"""Install/update the helper for the current Linux user. Never invokes sudo."""
import json
from pathlib import Path
import shlex
import shutil
import sys

if sys.version_info < (3, 10):
    raise SystemExit("Python 3.10 or newer is required.")
source = Path(__file__).resolve().parent
target = Path.home() / ".local/share/runrun-karaoke-helper"
target.mkdir(parents=True, exist_ok=True, mode=0o700)
shutil.copy2(source / "helper.py", target / "helper.py")
launcher = target / "run-helper"
launcher.write_text("#!/bin/sh\nexec " + shlex.quote(sys.executable) + " " + shlex.quote(str(target / "helper.py")) + "\n")
launcher.chmod(0o700)
manifest = Path.home() / ".mozilla/native-messaging-hosts/com.runrun.karaoke.json"
manifest.parent.mkdir(parents=True, exist_ok=True)
manifest.write_text(json.dumps({"name": "com.runrun.karaoke", "description": "RunRun karaoke audio helper", "path": str(launcher), "type": "stdio", "allowed_extensions": ["runrun-karaoke@silverwoodslabs"]}, indent=2) + "\n")
print("Installed/updated user helper. Return to Settings and choose Check again.")
