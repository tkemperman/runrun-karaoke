# RunRun karaoke MCP

The optional local MCP integration gives an agent project access and playable audio for the **fix-lyrics** workflow. It is a Python stdio server using [MCP JSON-RPC stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) and [MCP tools/audio content](https://modelcontextprotocol.io/specification/2025-06-18/server/tools). It has no Python package dependencies; audio uses the existing native helper's yt-dlp, Deno, FFmpeg and FFprobe dependencies.

## Install and connect

From this checkout:

```sh
python3 mcp/install.py
codex mcp add runrun-karaoke -- python3 /absolute/path/to/runrun-karaoke/mcp/server.py
```

The installer prints the exact command for this checkout. Reload the extension and open a YouTube video in Firefox. Restart/reconnect the MCP client if it cannot discover a newly registered server. The installed native host references this checkout, so reinstall after moving it. Install the skill by symlinking `skills/fix-lyrics` into `~/.codex/skills/fix-lyrics` (or the configured personal skill root).

`mcp/bridge.py` is a separate native messaging host, `com.runrun.karaoke.mcp`, restricted to this extension ID. The extension tries connecting on startup/interface load; without the optional host installed, normal karaoke operation continues. The bridge binds a private, same-user Unix socket under `$XDG_RUNTIME_DIR/runrun-karaoke-mcp-UID` (or `/tmp`). It listens on no TCP port and exposes neither page JavaScript execution nor arbitrary browser storage. API keys stay in the extension background. Only one Firefox profile can own the bridge at a time.

To remove the integration, remove the native host manifest `~/.mozilla/native-messaging-hosts/com.runrun.karaoke.mcp.json`, its launcher directory `~/.local/share/runrun-karaoke-mcp`, and the MCP registration (`codex mcp remove runrun-karaoke`), then reload Firefox/the extension. These paths contain no lyric backups. Recovery files stay in `~/.local/state/runrun-karaoke-mcp` until explicitly removed.

## Workflow and tools

- `list_videos`, `get_project`: obtain the video, duration, existing lyrics, configured target language and current revision. Open editors are checked for pending/failed saves; no profile database scraping is required.
- `prepare_audio`, `audio_status`: asynchronously reuse validated audio or download/extract the full recording, up to 45 minutes. No paid transcription/translation service is invoked. Progress is polled; keep the MCP connection open while preparing audio.
- `listen_audio`: returns actual WAV content (mono 24 kHz, at most 30 seconds per call). Its start/end are **absolute video seconds**. The agent listens, transcribes and translates; this server does not pretend that audio extraction is transcription. Clients that cannot deliver audio content to the model need a separate listening/transcription route.
- `search_lyrics`: anonymous LRCLIB search; references may differ from live performances.
- `stage_lyrics`, `get_review`: validate/save a full proposed project against the read revision, returning a three-column timestamp / original text + translation / new text + translation table. Includes insertions, removals, translation, timing and ruby changes. Stage does not change Firefox. The target language, video identity, display and source settings are preserved.
- `apply_lyrics`: after approval of that table, write the proposal with strict revision checking, retain a recovery JSON and refresh matching open editors. A conflicting editor is preserved and reported rather than overwritten. Re-read the project to verify.
- `prepare_publication`: inspect the exact repository, branch revision and files for the applied project. No upload.
- `publish_lyrics`: after separate user approval, publish to the reviewed branch revision with the saved GitHub credentials. Reject stale local/remote revisions; return a commit URL. No extension source commits. Verify the remote file and catalog Action before reporting success; ambiguous failures must be inspected, not blindly retried.
- `cleanup`: after separate approval, remove this video's cached audio if requested and discard derived review/publication preparation data. Keep the before/after recovery JSON. Does not clean arbitrary directories, other reviews or other videos. Audio snippets are streamed directly and are not saved on disk.

For Japanese, `furigana` is an array of `[text, annotationOrNull]`; concatenate the text parts to reproduce the line exactly. The shared core validator supports kana readings and intentional kanji annotations over kana text. Existing row IDs remain stable, new lines get new IDs, and `block.start/end + project.offset` is video time. Translations use `block.translations[project.translationLanguage]`.

Publication and cleanup tools are available to the agent; user consent is enforced by the skill/host conversation, not by treating a boolean supplied by a model as proof of consent. Proposal IDs and publication IDs bind approval to concrete reviewed data, while revision checks prevent overwriting intervening edits.

## Checks and troubleshooting

```sh
npm test
npm run check
python3 -m unittest discover -s tests -p 'test_mcp*.py'
```

A missing bridge means the optional host is not installed, the extension has not reconnected, or another Firefox profile owns the socket. Reload the extension and open the intended video. A revision/editor conflict means save or reconcile the open editor, then read/stage again. Never force stale writes. Cached audio uses the same private per-video cache as AudioShake (`/tmp/runrun-karaoke-audio-UID`); preparation validates its duration before reuse.
