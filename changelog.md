# Changelog

This file tracks release status and planned scope. Planned features are not a record of completed work. Version 1.3.0 was released on September 14, 2026.

## 1.3.0 — Released 2026-09-14

- Clear the GitHub token input after submission and keep saved tokens exclusively in background storage; Settings receives only saved-token status.

- Replace Contact with inline About, showing the application name, installed version, © 2026 Thomas Kemperman and a contact email link with the application name as subject.
- Show Privacy Policy inline from the bundled `privacy.md`, keeping the external and inline policy in sync. Keep About and Privacy Policy headings and right-aligned Close buttons visible while their bodies scroll.
- Keep the Settings header compact before and during scrolling, with an opaque background that prevents content from overlapping the title. Use consistent Privacy Policy capitalization.
- Move unimplemented managed contribution logging, identifiers, moderation and retention descriptions into the development TODO. Remove developer-only publication details from the user-facing policy and clarify extension-private API key storage.
- Use `0:32.250` as the Start at, Start and End placeholder, showing millisecond syntax; simplify the line timing labels to Start and End.

- Load the karaoke interface and Settings only on the first Karaoke or Settings action, including keyboard shortcuts and the toolbar launcher. YouTube pages initially load only the lightweight buttons; editor construction, project reads and playback polling wait until activation.

- Add a resumable guided tutorial, simplified header controls and Contact email with the application name as subject. Separate lyric and reading corrections; the reading step expands its editor automatically. Omit the redundant manual-writing step.
- Hide GitHub repository configuration behind the default-off localStorage developer flag without deleting saved settings.
- Find lyrics checks the public catalog for exact YouTube-ID matches when Settings opens; LRCLIB remains available as an alternative. Catalog loading preserves edits made during downloads and confirms replacement.
- Replace bulk lyrics/translation paste boxes with file import and per-line editing. JSON imports into the current video without matching; export complete JSON or original lyrics as timed/untimed LRC.
- Use minutes:seconds timing fields and Start at / Sync instead of a separate delay input. Opening Settings enables Karaoke; closing it does not disable Karaoke.
- Add per-line insertion before/after, show line numbers as plain labels, rename Seek to Jump to, and confirm deletion only for nonempty or timed lines. Remove timing stamp buttons from the editor and tutorial.
- Clarify dictionary readings, planned translation submissions and privacy contact links. Managed submissions remain unimplemented.
- Retain the previous tutorial video icon as a reserve asset; the Tutorial button currently has no icon.
- Synchronize the repository template’s core copy. JavaScript syntax checks pass; 90 of 92 tests pass. Two credential tests fail because the existing temporary DISABLE_GITHUB_TOKEN switch disables token use; it remains enabled for local testing. Full Firefox acceptance testing remains outstanding.
- Built dist/runrun-karaoke-1.3.0.zip and verified ZIP integrity and manifest version. The package is unsigned and has not been published.

## 1.2.0 — Released 2026-09-12

- Editing a line start automatically shifts its end and all later lines by the same amount, preserving durations, gaps and untimed values without confirmation.
- Include the canonical YouTube `videoUrl` and original, unsanitized `videoTitle` in stored and exported projects. Derive the URL from `videoId` and capture the video title from the watch page.
- Publish translations under sanitized YouTube video title and video-ID folders (title first for sorting), preserving Japanese and other Unicode letters while normalizing whitespace, punctuation and repeated hyphens. Keep older catalog paths readable.
- Use project schema 3 with a single source object (provider and URL); migrate older source arrays using their last entry and replace the source when selecting another recording.
- Show GitHub search, load and publication feedback directly beneath the repository action buttons.
- Automatically save GitHub repository preferences and token changes; Clear token immediately removes the saved token.
- Consolidate preferences in the in-video Settings panel, including GitHub fields styled like AI translation. Toolbar and Firefox preferences open the same panel; shortcut customization uses Firefox’s own menu.
- Add separate GitHub retrieval and upload repositories and branches, with a locally stored upload token managed from Settings.
- Search public catalogs by video, title or artist; load validated projects with replacement confirmation and stale-edit protection.
- Publish complete projects through the GitHub Contents API with destination confirmation, Unicode encoding, and revision checks for updates.
- Provide a standalone lyrics repository template with validation, deterministic catalog generation and an Action that retries catalog commits after concurrent pushes.
- Rename the interface section to **AI translation** and update current usage instructions.
- All 84 automated tests and JavaScript syntax checks pass, covering repositories, source migration, video metadata and cascading timing.
- Migrate the existing GitHub catalog to video-title folders and add original video titles and URLs. Catalog generation was validated locally and changes pushed to GitHub. Full extension-driven publication, hosted Action and Firefox playback coverage remain outstanding.
- Build `dist/runrun-karaoke-1.2.0.zip`; verify ZIP integrity, version metadata and runtime-only contents. The package is unsigned; packaging does not publish to an add-on store.

## 1.1.1 — Released 2026-09-12

- Raise the minimum Firefox version to 142 to resolve the Android compatibility warning for `data_collection_permissions`, without declaring untested Android support.

- Allow **Start at** to initialize the first untimed lyric and **Sync with video position** to initialize the selected untimed line. Existing timed lines still synchronize using the global delay.
- Preserve milliseconds when synchronizing with video playback.
- Show a yellow warning when selecting untimed lyrics and while loaded lyric lines still need timing, explaining that remaining lines must be marked manually.
- The user confirmed the timing fix works. The timing regression suite passed as part of all 58 automated tests; JavaScript syntax checks passed.

## 1.1.0 — Released 2026-09-11

### Furigana and AI tools

- Rename Automatic translation to **AI translations**. Add **Generate furigana**, using the complete original song as context with the same saved OpenAI API key and selected model. The target translation language does not affect furigana.
- Keep **Generate furigana (dictionary)** under **Display & timing** as a local option without an API key. Download and cache EDICT2/ENAMDICT on first use; retain Furikazan's MIT attribution and EDRDG dictionary credits.
- Render ruby above current and next original lyric lines, with **Show furigana** saved per project. Align matching kana and okurigana outside ruby.
- Add editable per-line readings and **Correct a term throughout this song** directly above **Line editor**. Exact term corrections can merge split kanji and apply to every occurrence in the current project; they are not persistent dictionary rules.
- Change the dictionary button to **Re-generate furigana (dictionary)** when annotations exist. Confirm replacement of existing readings, including manual corrections. Show a spinner and disable generation buttons while working.
- Recognize verb imperatives such as `進め → すすめ`, including with cached dictionaries. Prevent superseded rare lemma readings from generating preferred inflections.
- Use strict AI output validation and reject incomplete, malformed or stale results without changing existing work. Editing original text clears that line's furigana; repeating a line copies it.
- Store and export furigana segments and visibility in project JSON schema 2. Migrate schema 1 projects without mutating the input; reject annotations that do not reconstruct the original lyrics or contain invalid readings. LRC does not preserve furigana.

### Maintenance and compatibility

- Changed the Firefox add-on ID to `runrun-karaoke@silverwoodslabs`. Firefox treats this as a separate extension from builds signed with the previous ID, `youtube-karaoke@local.test`.
- Removed 12 unused legacy icon files from the runtime assets and distribution package; retained the six manifest-referenced transparent mascot icons and microphone image.
- Added the MIT License, copyright 2026 Thomas Kemperman, and declared it in package metadata and documentation. Future extension packages include the license file.

### Validation

- 56 automated tests passed, including AI request construction, invalid output rejection, dictionary inflections, saved-key routing, and furigana JSON round trips. JavaScript syntax checks passed.
- The user confirmed the dictionary overlay and successful AI furigana generation with a live API request during development (September 11, 2026). Full Firefox visual/playback coverage remains outstanding.
- Built `dist/runrun-karaoke-1.1.0.zip`; version metadata and ZIP integrity checks passed. The local build artifact is unsigned; release was confirmed by the user.

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
