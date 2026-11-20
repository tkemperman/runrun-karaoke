---
name: fix-lyrics
description: Correct or generate runrun-karaoke lyrics and their translation by listening to the actual YouTube recording through its MCP integration, then present a timestamped review table before applying. Supports missing lines, live-version differences and Japanese furigana.
---

# Fix lyrics

Use the `runrun-karaoke` MCP server. The maintained integration, installation commands and tool contract are in [mcp/README.md](../../mcp/README.md). The skill is also installed in the personal skill directory; resolve its symlink to the repository when following that reference. Do not read Firefox profile databases, expose API keys, or replace the MCP integration with DOM/storage hacks.

## Inspect and listen

1. Call `list_videos`, select the requested video, then `get_project`. Ask which video only if the request and open tabs do not identify it. Keep its exact project, revision, targetLanguage, IDs, timing offset and display settings. Use `hasLyrics` to choose correction or creation. Existing lyrics may still contain missing lines or an incomplete translation.
2. Call `prepare_audio` with that video's duration and poll `audio_status`. This reuses validated cached audio; otherwise it downloads and extracts the recording. It does not call AudioShake or OpenAI. Listen with `listen_audio` in overlapping fragments of at most 30 seconds. Cover the whole requested scope, including gaps, spoken intros, ad-libs and the ending. Audio positions are absolute video seconds; stored block times exclude the project's offset.
3. If lyrics exist, compare **what is actually sung** with every current line and its timing. Count omissions as errors and add missing sung/spoken lines at the correct times. Preserve real English words, interjections and live improvisation. Consult `search_lyrics` (LRCLIB) when useful to identify the original words, names or spelling; official/studio lyrics do not override clearly different live audio. State uncertainty instead of inventing unclear words. If no lyrics exist, transcribe the recording and create timed lines plus a natural translation in `targetLanguage`.
4. Translate every new/corrected line into the configured target language, preserving the performed meaning and naming choices. For Japanese, supply furigana segments as `[text, readingOrNull]` whose text concatenates exactly to the line. Use the pronunciation heard; preserve intentional reverse ruby (kana below, kanji above), e.g. ドーマン / 道満 and セーマン / 晴明. Do not silently replace the sung name with a different historical reading. Preserve unchanged IDs/timings/ruby; assign new stable IDs to inserted lines. Explain any timing or ruby-only changes too.

The agent performs transcription/translation from the audio and context. No paid generation calls are built into this MCP server. Respect any session-specific API call limits; a new skill invocation does not reset them. If the current client cannot expose audio content to the model, report that limitation and arrange an available listening/transcription route before making audio-based claims. Never claim to have listened based only on file metadata, an ASR transcript or LRCLIB.

## Review, then apply

Call `stage_lyrics` with the original revision, the full proposed project and concise evidence/uncertainty notes. This validates and saves a proposal **without changing the extension**. Present its differences in exactly these three columns:

| Timestamp | Oorspronkelijke tekst + vertaling | Nieuwe tekst + vertaling |
|---|---|---|

Put text and translation together in each cell. Use `—` on the original side for omissions/new lines and on the new side for removals. Show the actual video timestamp (including the offset); display old → new timestamps for timing corrections. Include ruby changes visibly and explain any metadata changes returned by the tool. For an empty project, the table contains all new lines. Notes may explain ambiguity or a live variation, but do not add more columns.

**Stop for the user's review.** Ask whether to implement or revise the suggestions. “Implement” authorizes only the shown local proposal, not publishing or cleanup. If the user requests adjustments, stage a revised proposal and show the updated table; do not silently apply additional suggestions. Keep the reviewId to resume with `get_review`.

After approval, call `apply_lyrics` for that exact reviewId. This updates original lyrics, translations, timing and ruby together and keeps a recovery JSON. Read back with `get_project` and check the result/editorUpdates. If the project changed meanwhile, re-read and reconcile; do not override the revision check or discard the user's newer edits. Check relevant corrected passages in the running extension without changing the playback state unnecessarily.

## Publication and cleanup

Once the applied result is verified, call `prepare_publication`, show the concrete repository/branch/files and ask **whether to publish the lyrics and translation to GitHub**. After explicit approval, call `publish_lyrics` using its publicationId. Verify the returned commit/file contents and catalog Action; report failures as failures. Do not publish extension/project source changes. Do not automatically retry a publication after an ambiguous network error: inspect the remote state first.

Then ask separately **whether to remove the temporary audio and intermediate review artifacts**. Cleanup may also be offered if publication is declined; do not imply that either choice authorizes the other. Call `cleanup` only after approval, respecting whether audio is included. This tool preserves a before/after recovery JSON and leaves other videos and unrelated files alone. Report what was published, what was cleaned, and where recovery data remains.
