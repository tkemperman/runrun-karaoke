"""Install/update the helper for the current Linux user. Never invokes sudo."""
import json
import os
from pathlib import Path
import shlex
import stat
import sys
import tempfile

if sys.version_info < (3, 10):
    raise SystemExit("Python 3.10 or newer is required.")
source = Path(__file__).resolve().parent
target = Path.home() / ".local/share/runrun-karaoke-helper"
target.mkdir(parents=True, exist_ok=True, mode=0o700)
target_info = target.lstat()
if not stat.S_ISDIR(target_info.st_mode) or target_info.st_uid != os.getuid():
    raise SystemExit("Refusing to install into a directory not owned by the current user.")
target.chmod(0o700)


def atomic_write(destination, data, mode):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("wb", dir=destination.parent, prefix=f".{destination.name}-", delete=False) as file:
            temporary = Path(file.name)
            os.fchmod(file.fileno(), mode)
            file.write(data)
            file.flush()
            os.fsync(file.fileno())
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


atomic_write(target / "helper.py", (source / "helper.py").read_bytes(), 0o600)
launcher = target / "run-helper"
atomic_write(launcher, ("#!/bin/sh\nexec " + shlex.quote(sys.executable) + " " + shlex.quote(str(target / "helper.py")) + "\n").encode(), 0o700)
manifest = Path.home() / ".mozilla/native-messaging-hosts/com.runrun.karaoke.json"
manifest.parent.mkdir(parents=True, exist_ok=True)
manifest_data = json.dumps({"name": "com.runrun.karaoke", "description": "RunRun karaoke audio helper", "path": str(launcher), "type": "stdio", "allowed_extensions": ["runrun-karaoke@silverwoodslabs"]}, indent=2) + "\n"
atomic_write(manifest, manifest_data.encode(), 0o600)
print("Installed/updated user helper. Return to Settings and choose Check again.")
