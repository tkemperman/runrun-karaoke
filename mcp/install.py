#!/usr/bin/env python3
"""Install the optional local MCP native bridge for the current user, without sudo."""
import json
import os
from pathlib import Path
import shlex
import sys
import tempfile

source = Path(__file__).resolve().parent
sys.path.insert(0, str(source.parent / 'native'))
from helper import private_directory


def atomic_write(path, text, mode):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', dir=path.parent, encoding='utf-8', delete=False) as file:
            temporary = Path(file.name)
            os.fchmod(file.fileno(), mode)
            file.write(text)
            file.flush()
            os.fsync(file.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


root = private_directory(Path.home() / '.local/share/runrun-karaoke-mcp')
launcher = root / 'bridge'
atomic_write(launcher, '#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(source / 'bridge.py')) + '\n', 0o700)
manifest = Path.home() / '.mozilla/native-messaging-hosts/com.runrun.karaoke.mcp.json'
manifest.parent.mkdir(parents=True, exist_ok=True)
atomic_write(manifest, json.dumps({'name': 'com.runrun.karaoke.mcp', 'description': 'RunRun karaoke local MCP bridge', 'path': str(launcher), 'type': 'stdio', 'allowed_extensions': ['runrun-karaoke@silverwoodslabs']}, indent=2) + '\n', 0o600)
print('Installed local MCP bridge. Reload the extension, then open a YouTube video.')
print('Register the stdio server with your MCP client:')
print('codex mcp add runrun-karaoke -- ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(source / 'server.py')))
