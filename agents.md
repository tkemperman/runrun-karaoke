# YouTube Karaoke — Development Plan

## Project language

Use English for source code comments, identifiers, documentation, commit messages, and default interface text. Preserve lyrics, translations, artist names, and song titles in their original languages. The add-on is intended for public distribution.

## Current scope decision

Automatic translation and translation fetching are excluded. Keep manual translation entry and JSON import/export. Do not reintroduce MyJpop fetching. Apply translation assigns pasted non-empty lines in order, without semantic matching. Different line counts require an explicit Apply anyway choice; unmatched originals stay unchanged and extra translations are ignored. Confirm replacement of existing translations. Artist alias lookup uses explicit spellings and does not translate text.

## Objective

Build a Firefox add-on that displays synchronized lyrics alongside YouTube videos. Show the original text above its corresponding translation. Fully support Japanese kanji and kana. Allow lyrics, translations, and timing to be edited independently.

## Reference performance

- Song: Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆ / Ahoy!! 我ら宝鐘海賊団☆.
- Special live performance: https://www.youtube.com/watch?v=h3chCOV_phw
- Initial English translation source: https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/
- The exact performance, available lyrics, and timing have not yet been verified. Do not assume studio timing matches this video.
- Use this performance to validate Japanese text, English translations, changes in live song structure, and video-specific timing.

## Shared architecture

- A content script manages the overlay and follows the YouTube player's playback position.
- A background component handles external source requests and local storage. Request only necessary extension permissions and access to source hosts in use.
- Separate rendering, player integration, source providers, translation mapping, and timing editing.
- Use the player's current playback position as the clock to avoid accumulated drift when pausing, seeking, or changing playback speed.
- Store customized performances by YouTube video ID. Keep retrieved source data separate from user corrections so refreshing a source does not overwrite edits.
- Each text block has a stable ID, start and end times in seconds, original text, and translations keyed by language. Repeated lines have separate blocks.
- Project metadata includes video ID, title, artist, original language, selected translation language, sources, and a global timing offset.
- Version the storage and export schema and provide migrations when it changes.
- Support empty intervals for instrumental passages and additional blocks for live interludes.

### Lyrics sources and manual translations

- LRCLIB is the primary lyrics provider for version 1.0.0. Use synchronized lyrics when available; do not assume complete catalog coverage.
- Search explicit artist aliases and extracted song titles; keep manual recording selection and query correction available.
- Keep source retrieval separate from rendering and timing logic. Request only permissions for sources in use.
- Support manual lyrics pasting and LRC or project JSON import when sources are unavailable.
- Accept pasted translations through Apply translation, then allow per-line corrections in Line editor. Preserve original text, timing, and other translation languages.
- Skip blank lines during assignment. Warn when counts differ and offer Apply anyway or Cancel before changing data.
- Save applied translations locally; unapplied pasted text is temporary.
- Display source links. Treat retrieved content as untrusted text; never execute source HTML or scripts.

## Version 1.0.0 — Line-based karaoke

### Features

1. Detect the active YouTube video and derive an initial search from available title metadata. Allow manual artist and title corrections.
2. Search LRCLIB and let the user select a suitable recording. Rank title and explicit artist-alias matches; let the user choose because live and studio versions may differ.
3. Import LRC files and accept manually entered lyrics. Unsynchronized lyrics require timing edits before synchronized playback is possible.
4. Accept pasted translations and assign them in order with Apply translation, allowing manual corrections. Display Japanese kanji/kana with English directly underneath, changing together as one block.
5. Provide a readable overlay showing the active line and optionally the next line, with visibility, text size, vertical placement, and fullscreen controls. Center both languages inside the YouTube player.
   - Toggle subtitles with a configurable shortcut, default `Alt+K`, or a microphone Karaoke button injected after `[data-yt-extension="transcript-copier"]` in `ytd-watch-metadata #owner`. Use the supplied microphone image as a 19×19 monochrome mask. Add an adjacent gear button that always opens the lyrics and timing settings. Fall back to the end of the owner row when Transcript tools are absent.
   - The extension toolbar icon opens Settings directly. Do not add an intermediate on/off menu.
   - Keep button and shortcut state synchronized. New tabs start with karaoke off; activation is per tab.
6. Provide an earlier/later timing offset saved per video.
7. Build a timing editor: during playback, a key marks the start of the next line. Allow subsequent start/end edits and inserting, deleting, repeating, and moving blocks. Do not trigger shortcuts while typing in text fields.
8. Allow lyrics and translation edits without re-entering timing.
9. Save projects and corrections locally. Support JSON export/import preserving both languages and timing. Retain LRC import; LRC alone is insufficient for a complete bilingual project.
10. Provide useful feedback for missing lyrics, missing translations, network failures, and invalid imports. Preserve existing work when errors occur.

### Implementation sequence

1. Extension scaffold, player integration, and overlay using short original sample text.
2. Data model, local storage, JSON import/export, and LRC parsing.
3. LRCLIB adapter, search interface, and recording selection.
4. Pasted translation assignment and manual per-line translation editing.
5. Timing editor and video-specific corrections.
6. Synchronize the reference performance in the browser and verify the complete workflow.

### Acceptance criteria

- The correct English passage appears beneath each corresponding Japanese block in the reference performance.
- Timing matches the live performance, with editable introductions, repetitions, and interruptions.
- Pausing, seeking in either direction, changing speed, and fullscreen preserve synchronization.
- Navigating between YouTube videos without a page reload clears old content and loads the appropriate project.
- Reloading preserves text corrections, translation mappings, and timing.
- Export followed by import preserves both languages, block order, sources, and timestamps.
- Apply translation skips blank lines, warns on different counts, offers Apply anyway and Cancel, confirms replacement, and preserves original lyrics and timing.
- Use focused tests for parsing, time selection, import validation, and storage. Manually verify rendering and player interaction in Firefox.

### Out of scope

- Audio analysis, automatic word timing, and word highlighting.
- Automatic translation through a custom AI service.
- A mandatory backend, user accounts, and cloud synchronization.
- YouTube captions as a required source; these may be investigated later as an additional provider.

## Version 2.0.0 — Audio analysis and word timing

### Objective

Derive timing from the actual performance using existing Japanese lyrics as the starting point. Add highlighting per word or useful Japanese text segment. Keep English translations beneath the original line, switching per text block.

### Initial investigations

- Determine a reliable Firefox audio input route: permitted tab audio capture, a local companion application, or a user-supplied audio file.
- Prototype before choosing local processing or an explicitly enabled backend. Uploading audio requires a deliberate user choice.
- Investigate forced alignment with Japanese support, using WhisperX or another suitable tool. Verify current capabilities during implementation.
- Measure quality for singing, backing music, shouts, speech, and differences between written lyrics and the live performance.
- Investigate Japanese segmentation: words are not separated by spaces, and sung sounds do not directly correspond to individual kanji. Do not promise character-level timing without validation.

### Analysis pipeline

1. Obtain audio with a known mapping to video time. Preserve any recording offset and detect discontinuities; recordings containing pauses or seeks do not represent a continuous video timeline.
2. Prepare audio. Investigate optional vocal separation only if it demonstrably improves results.
3. Align known original lyrics with the audio. Use transcription where needed to flag changed or additional passages; do not automatically overwrite existing text.
4. Calculate line start/end times and, where reliable, word or segment times.
5. Flag uncertain or unaligned passages for review. Preserve manual timing until the user applies an analysis result.
6. Let the user listen to and correct results in the editor.
7. Save the selected result per video with the analysis method and model version to avoid unnecessary reprocessing.

### Features

- An explicit action to analyze a video or selected interval, with progress, cancellation, and error handling.
- Inspection and correction of line and segment timing, including fallback to manual timing.
- Highlighting within Japanese lines based on actual segment timestamps. Do not distribute words uniformly across a line.
- Preserve English mappings when timing changes; splitting or merging blocks may require manual remapping.
- Version 1.0.0 projects continue working without audio analysis or an additional service.
- Document hardware requirements, processing time, and any backend costs based on measurements.

### Implementation sequence

1. Prototype audio input and Japanese alignment on a representative part of the reference performance.
2. Compare results against manually verified timing and select the processing architecture.
3. Add analysis jobs, progress, and cancellation.
4. Extend storage, import/export, and the editor with segment timing and schema migrations.
5. Implement segment highlighting with line-based display as a fallback.
6. Verify the entire live performance and additional songs covering other languages and performances.

### Acceptance criteria

- Analysis uses the specific live performance and produces reviewable timing.
- Evaluate manually annotated passages containing singing, speech, repetition, and instrumental silence. Report timing error and the percentage of correctly aligned segments; set a realistic quality threshold after the prototype.
- Uncertain passages are visibly flagged and remain manually editable.
- Japanese segment highlighting follows the vocals while the corresponding English translation remains readable underneath.
- Seeking, pausing, and speed changes continue to work with generated timing.
- Cancellation or analysis failure does not damage existing projects.
- Version 1.0.0 projects retain their content and timing after migration.

## Working practices

- Keep the working version at `1.0.0` during development and testing. The user will commit when the add-on works sufficiently well; do not create commits unless explicitly asked. An unreleased version number does not imply that all acceptance criteria have passed.

- Complete version 1.0.0 before implementing version 2.0.0 audio analysis.
- Verify source availability and the reference video during implementation. Do not claim successful synchronization without checking the actual performance.
- Use short original text in automated test fixtures; avoid unnecessarily bundling source lyrics with the extension.
- Keep changes small and verify each milestone against its acceptance criteria.
