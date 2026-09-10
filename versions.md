# Versions

This file tracks release status and planned scope. Planned features are not a record of completed work. Version 1.0.0 was released on September 10, 2026.

## Unreleased

- Changed the Firefox add-on ID to `runrun-karaoke@silverwoodslabs`. Firefox treats this as a separate extension from builds signed with the previous ID, `youtube-karaoke@local.test`.
- Removed 12 unused legacy icon files from the runtime assets and distribution package; retained the six manifest-referenced transparent mascot icons and microphone image.
- Added the MIT License, copyright 2026 Thomas, and declared it in package metadata and documentation. Future extension packages include the license file.

## 1.0.0 — Released 2026-09-10

### Documentation

- Established the development plan and acceptance criteria in `agents.md`.
- Added the project overview in `readme.md`.
- Established English as the language for code comments and project documentation.
- Updated the development plan and usage instructions for manual translation assignment, mismatch overrides, artist aliases, and display controls; removed superseded translation-provider requirements.
- Documented Start at, selected-line synchronization, video times in Line editor, per-video search queries, automatic translation progress, and Firefox data consent.

### Implemented

- Renamed the add-on to ルンルンKARAOKE, including settings, editor, documentation, and distribution package. Retained the existing Firefox extension ID for continuity of saved settings and projects.
- Microphone Karaoke button after the Transcript tools, with owner-row fallback.
- Adjacent gear button to toggle lyrics and timing settings open or closed; the Close button remains available. Activation uses the microphone button or shortcut; the settings panel has no duplicate on/off button.
- Configurable Alt+K activation and Settings opened directly from the extension icon.
- Bilingual overlay with adjustable size and vertical placement inside the player.
- Aligned the “Show next line” checkbox beside its clickable label in display settings.
- Added Apply translation to map pasted lines in order into Line editor, skipping blanks, warning on different line counts with Apply anyway and Cancel options, and confirming replacement of existing translations. Apply anyway preserves unmatched original lines and ignores extra translation lines; applied translations are saved locally without changing timing.
- Alias-aware LRCLIB search with title extraction, curated Marine/FUWAMOCO spellings, recording deduplication, ranking, and broader fallback queries; no automatic title translation.
- LRCLIB search, LRC import, manual line timing, local per-video storage, and JSON import/export.
- Manual translation entry and passage mapping; removed the experimental MyJpop fetcher, translation-provider interface, and host permission.
- Search queries follow the current video title until manually edited. Edited queries are saved per video and restored on reload or return; navigation loads the destination video's query or title. The editor header shows the current YouTube title without the video ID.
- Removed the demo loader and its interface instructions; original sample text remains limited to test fixtures.
- Added Start at to calculate the global delay from the first timed, non-empty lyric's desired video start. Added Sync with video position beside the field to align the selected timed line with the current video position rounded to whole seconds, preserving relative timing.
- Line editor displays and edits video times including the delay. Offset changes refresh displayed times; exact adjusted start/end boundaries are covered by a regression test.
- Optional OpenAI translation with persistent local API key, model, and language preferences, strict block-ID mapping, replacement confirmation, and rejection of invalid or stale results. The translation button shows a spinner and is disabled during requests to prevent duplicate submissions.
- Declared search terms, website content, and authentication information in Firefox's required data collection permissions. Raised the minimum Firefox version to 140 for built-in installation consent.
- Core, search, translation, and background tests and a runtime-only ZIP packaging script.

### Build and validation

- Built `dist/runrun-karaoke-1.0.0.zip` with the data collection declaration for submission. The local build artifact is unsigned; release was confirmed by the user.
- All 41 automated tests, JavaScript syntax checks, and ZIP integrity checks passed.
- The user confirmed synchronization and the Start at / sync button layout during manual testing.

The first release provides bilingual, line-based karaoke for YouTube in Firefox. Audio analysis and word highlighting are excluded.

### Scope

- YouTube player integration and an adjustable overlay with fullscreen support.
- Original lyrics with the corresponding translation directly underneath.
- LRCLIB lookup and selection of the appropriate recording.
- Manual translations and optional OpenAI automatic translation with persistent local API settings.
- Manual text entry, translation editing, and passage mapping.
- LRC import and complete bilingual JSON project import/export.
- Manual line timing, editable live arrangements, and per-video timing offsets.
- Local storage that preserves user corrections.
- Handling for unavailable sources, invalid imports, and navigation between videos.

## Follow-up validation — Unscheduled

Release does not imply completion of every acceptance check in [agents.md](agents.md). Remaining validation:

- Complete Firefox acceptance coverage, including all display modes, shortcuts, and playback scenarios; automated browser verification has not been performed.
- Validate timing for the Japanese live reference performance with English translations.

## 2.0.0 — Planned

Audio-assisted timing and word or Japanese text segment highlighting.

### Scope

- A verified audio input route and a processing architecture selected through prototyping.
- Alignment of existing lyrics with the actual performance.
- Line and segment timestamps, with uncertain passages flagged for review.
- Analysis progress, cancellation, error handling, and manual correction.
- Segment highlighting with line-based fallback.
- Preservation of translation mappings and existing manual edits.
- Storage migrations and compatibility with version 1.0.0 projects.

### Release gate

Complete the version 2.0.0 acceptance criteria in [agents.md](agents.md). Measure alignment accuracy against manually annotated passages and establish a quality threshold after the prototype. Verify that cancellation, failure, and migration preserve existing work.

## Release maintenance

When a version is released, replace its planned status with its release date and describe only delivered functionality. Move unfinished scope to a future section. Record relevant fixes, compatibility changes, and migration requirements with each release.
