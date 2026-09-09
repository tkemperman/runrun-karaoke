# Versions

This file tracks release status and planned scope. Planned features are not a record of completed work. No signed public versions have been released. Version 1.0.0 is under development and has not been released.

## 1.0.0 — Unreleased

### Documentation

- Established the development plan and acceptance criteria in `agents.md`.
- Added the project overview in `readme.md`.
- Established English as the language for code comments and project documentation.
- Updated the development plan and usage instructions for manual translation assignment, mismatch overrides, artist aliases, and display controls; removed superseded translation-provider requirements.

### Implemented

- Microphone Karaoke button after the Transcript tools, with owner-row fallback.
- Adjacent gear button to toggle lyrics and timing settings open or closed; the Close button remains available. Activation uses the microphone button or shortcut; the settings panel has no duplicate on/off button.
- Configurable Alt+K activation and Settings opened directly from the extension icon.
- Bilingual overlay with adjustable size and vertical placement inside the player.
- Aligned the “Show next line” checkbox beside its clickable label in display settings.
- Added Apply translation to map pasted lines in order into Line editor, skipping blanks, warning on different line counts with Apply anyway and Cancel options, and confirming replacement of existing translations. Apply anyway preserves unmatched original lines and ignores extra translation lines; applied translations are saved locally without changing timing.
- Alias-aware LRCLIB search with title extraction, curated Marine/FUWAMOCO spellings, recording deduplication, ranking, and broader fallback queries; no automatic title translation.
- LRCLIB search, LRC import, manual line timing, local per-video storage, and JSON import/export.
- Manual translation entry and passage mapping; removed the experimental MyJpop fetcher, translation-provider interface, and host permission.
- Original Japanese/English demo text for playback testing.
- Core and background integration tests and a runtime-only ZIP packaging script.

### Not yet verified

- Live Firefox rendering, shortcut behavior, and playback synchronization.
- Timing for the reference performance.

Target for the first usable release: bilingual, line-based karaoke for YouTube in Firefox.

### Scope

- YouTube player integration and an adjustable overlay with fullscreen support.
- Original lyrics with the corresponding translation directly underneath.
- LRCLIB lookup and selection of the appropriate recording.
- Manual translations only; automatic translation and translation fetching are excluded.
- Manual text entry, translation editing, and passage mapping.
- LRC import and complete bilingual JSON project import/export.
- Manual line timing, editable live arrangements, and per-video timing offsets.
- Local storage that preserves user corrections.
- Handling for unavailable sources, invalid imports, and navigation between videos.

### Release gate

Complete the version 1.0.0 acceptance criteria in [agents.md](agents.md), including browser validation of the Japanese live reference performance with English translations. Audio analysis and word highlighting are excluded from this release.

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
