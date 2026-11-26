---
name: add-sweep
description: Add progressive karaoke highlighting (a color sweep within sung words or syllables) to a runrun-karaoke YouTube project through MCP, listening to the actual recording. Reuse correct subtitles and sweep idempotently; create or correct lyrics and translations when missing or wrong.
---

# Add sweep

Use the `runrun-karaoke` MCP integration. Its tool contract and installation are in [mcp/README.md](../../mcp/README.md); resolve the personal skill symlink to the repository when following this reference. Use project tools rather than Firefox profile databases or DOM/storage edits.

## Prerequisites at invocation

Require an explicit YouTube video URL for each invocation, for example `add sweep https://www.youtube.com/watch?v=6GBJyMryLU0`. If the request has no video URL, ask the user for it and wait before calling tools or starting the workflow. Do not infer the target from open tabs, a previously used video, or an example URL in a request to edit this skill. Accept a URL supplied in response to that question; if it does not identify a specific YouTube video, ask for a valid video URL.

Once the video URL is supplied, call `check_dependencies`. If tools are missing, show their names and the returned installation instructions before attempting audio work; do not silently install software. This checks Python 3.10+, yt-dlp, Deno, FFmpeg and ffprobe and reuses the native helper's distro-aware installer checks. After installation, rerun the check. Already-valid sweep can still be inspected without preparing audio.

If the MCP server is unavailable, show the setup commands from [mcp/README.md](../../mcp/README.md), including installing the native bridge and reconnecting the client. If Python itself is unavailable, use [native/README.md](../../native/README.md) and `sh native/install.sh --check` from the checkout to obtain verified distro instructions. Do not guess package-manager commands for an unknown platform.

Audio listening through MCP does not require a local ML stack. When the client cannot hear audio and a local forced-alignment route is needed, check that route's selected Python environment first and give its missing-dependency installation instructions from [references/local-alignment.md](references/local-alignment.md). Do not assume packages installed for the MCP interpreter are available in the alignment environment, or vice versa.

Explain the boundary when relevant: downloading/cache/extraction, project writes and rendering are local. The agent decides what to reuse/correct, makes or reviews text/translation/timing proposals, and orchestrates MCP. Audio returned by `listen_audio` is sent to the agent client for model access. Optional local alignment runs on-device; it does not create missing lyrics or translations. No paid provider is implicitly invoked.

## Inspect and align

- Extract the video ID from the supplied URL, match that exact ID with `list_videos`, and read its `get_project`. If that video is not connected, have the supplied URL opened in Firefox and retry; never substitute another open video. Retain its revision, exact IDs, targetLanguage, offset, display and source. Inspect existing lyrics, translations, ruby and sweep before deciding what needs work.
- Reuse `prepare_audio` with the video duration, polling `audio_status`. This uses the existing full-track download/extraction and validated cache; it does not start paid AudioShake or OpenAI requests. Do not write another downloader. Use `listen_audio` in overlapping fragments of at most 30 seconds to hear the actual performance, including repeats, gaps and the ending. A client unable to deliver audio content to the model must arrange an available listening/alignment route or report that limitation, rather than inventing timing or claiming to have listened.
- With existing lyrics, check whether they match the recording. Reuse correct lyrics, translations, ruby and line timing. Preserve stable IDs for retained lines, including repeated lines. If lyrics are wrong or incomplete, correct/transcribe the performed text, update the affected translations and Japanese furigana, and add/remove lines where the performance requires it. Clear stale sweep on changed text and align the corrected version. Explain material corrections and uncertainty; do not silently preserve lyrics known to be wrong.
- Be idempotent: preserve existing valid sweep on unchanged, correctly aligned lines. Do not regenerate IDs, shuffle segmentation, retranslate correct text or rewrite timing merely because the skill runs again. If lyrics and sweep already cover the recording correctly, report that nothing needs changing. When the user explicitly confirms the lyrics and line timing are correct, use that as the starting point and focus audio analysis on missing/incorrect sweep.
- Without lyrics (`hasLyrics: false`), transcribe the recording into timed lines with new stable IDs, and add natural translations in the configured targetLanguage. Supply Japanese furigana where known, preserving the existing visibility setting. `search_lyrics` may help identify spelling, but the actual recording controls what is sung. Do not invoke paid generation merely because subtitles are missing.

## Segment contract

Projects use schema 5 (schemas 1–4 migrate). Each block receiving sweep needs `start`, `end` and a `sweep` array:

```json
{"text":"Hello world","start":10,"end":13,"sweep":[
  {"text":"Hello ","start":10.1,"end":11.2},
  {"text":"world","start":11.7,"end":12.8}
]}
```

All numbers are **project seconds**: audio/video time minus `project.offset`, including each segment's start/end. Preserve the offset and convert exactly once. Segment text must concatenate to the exact original block text, including spaces and punctuation. Attach spaces/punctuation to adjacent sung segments. Times must be finite, strictly positive in duration, sequential without overlap, inside the line's finite start/end and the video duration. Gaps between segments hold the previous highlight. Do not split graphemes, combining marks or emoji sequences. Empty instrumental blocks need no sweep.

Use words or useful Japanese syllable/phrase units based on what you hear. Split long words where sung timing warrants it. The renderer interpolates within each supplied segment; never substitute evenly divided line timing for measured word timing. Keep a compound's ruby intact; the overlay handles sweep segments independently of ruby segmentation. Do not assign the original vocal timing to translated words.

## Apply and verify

Call `stage_sweep` with the original revision, full proposed project and concise notes about evidence and uncertain passages. It validates without editing Firefox and returns a reviewId, before/after data and a timing diff. Inspect the result for unintended dropped content or incorrect offsets. A `status: unchanged` result has no reviewId: finish without calling apply. Identical repeated proposals do not create reviews or bump the project revision. Do not present uncertain timings as verified. Leave materially unaligned lines without sweep so they retain ordinary line captions, preserve their text/translations, and report the returned coverage and unresolved passages. Never fill gaps with uniformly divided line timing.

An instruction to add sweep authorizes applying it locally, including creating or correcting subtitles and their translation: use `apply_sweep` for this exact reviewId. No additional approval is needed for that requested local work. This keeps a recovery JSON, checks revisions and refreshes open editors. On a conflict, re-read and reconcile; never force a stale proposal. Re-read `get_project`, check editorUpdates, and test representative passages in the overlay, including pauses, seeking backwards, playback speed changes, repeated lines and instrumental gaps. Preserve the user's playback state after testing. Distinguish technical rendering verification from the accuracy of audio alignment.

Report coverage, uncertainty and the recovery path. Keep cached audio for reuse. Publishing to GitHub and cleanup are separate actions, requiring their own user authorization; use `prepare_publication` before presenting a publication destination. Do not treat adding sweep as permission to publish, delete audio or commit extension source.
