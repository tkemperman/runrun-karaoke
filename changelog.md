# Changelog

## Development changes — 2026-11-26

- Build only the public distribution, also used for local testing; remove the separate local packaging target.
- After successful packaging, retain the three newest release ZIPs by numeric version and remove obsolete local variants. Preserve unrelated files and existing distributions when a build fails.
- Require version bumps only for changes to add-on functionality relevant to users; packaging and other development-only changes keep the current version.

## 2.0.0 — Released 2026-11-25

- Publish only the sweep color from display settings to GitHub, preserving lyrics, translations, furigana and PH timing. Keep every display preference in local storage and JSON backups.
- Add a full progressive highlighting editor with editable text/Start/End rows, Add/Remove, Apply/Reset, draft preservation, validation and per-segment seeking.
- Add separate per-video original lyrics and translation color pickers; use a slider for caption spacing.
- Add a per-video spacing slider (0–30% of video height): leftmost/default is the tightest text fit, with no inactive slider range. Older negative values migrate to 0%. Use one transparent caption-background layer to prevent overlap darkening.
- Default progressive highlighting to pink and add a per-video Highlight color picker under Display & timing.
- Add progressive karaoke highlighting from per-word or syllable timing, with ruby support and playback-clock synchronization.
- Add MCP `stage_sweep` / `apply_sweep` and the `add-sweep` skill, reusing cached track downloads and creating missing subtitles.
- Project schema 5 preserves sweep in JSON and catalog data; older projects migrate. Text edits and replacement timing invalidate stale sweep data.

- Align progressive timing buttons with the Start/End input fields.
- Validation: 232 JavaScript tests, 38 Python tests and JavaScript/Python/shell syntax checks pass. Firefox checks cover the highlighting renderer, caption spacing, and creating/editing/removing segment timing. On November 26, the user confirmed reviewing the updated tutorial and authorized committing without repeating the walkthrough. No paid generation or add-on lint run was performed during this release preparation.
- Follow-up validation on November 26: applied partial sweep through MCP and checked playback rendering; updated the live lyrics catalog validators for schema 5 and verified its successful GitHub Action. Rebuilt and verified both distribution archives before committing.
- Build and verify both unsigned 2.0.0 distributions: ZIP integrity, version metadata, exact runtime/privacy files and nested native-helper contents. No signing, upload or publication performed.

## 1.5.2 — Released 2026-11-25

- Add asynchronous AI translation through MCP using saved OpenAI settings and the project's target language, with optional furigana and romaji conversion. Reuse running jobs, report progress, and return proposed projects for review before applying; reject stale or incomplete results.
- Tighten AI furigana output constraints and validation. Reject empty segments, mismatched lyric text and non-kana readings; report the affected line and recovery guidance without changing existing work.
- Fix Linux MCP connection discovery when the client has no XDG_RUNTIME_DIR by using the desktop user's runtime directory when available.
- Correct GitHub publication confirmation to detect existing destination files and show the replacement prompt.
- Validation: 209 JavaScript tests, 31 Python tests and JavaScript/Python/shell syntax checks pass. No live paid API requests, authenticated GitHub writes, browser walkthrough or add-on lint run were performed for this release.
- Build and verify both unsigned 1.5.2 distributions, including version metadata, ZIP integrity and exact runtime, privacy policy and native-helper contents. No signing, upload or publication performed.

## 1.5.0 — Released 2026-11-20

- Add optional local MCP integration and the discoverable fix-lyrics skill. Inspect existing lyrics, listen to cached/downloaded audio, consult LRCLIB, and stage a timestamped original/new text-and-translation table. Apply only after review; publishing lyrics and cleaning up audio each require separate permission. Preserve recovery JSON and reject stale project/repository revisions.
- Fix synchronization to capture the clicked video position accurately and preserve playback state. Replace Reset Start at with an inline cross that sets 0:00, remove its placeholder, refresh timing after LRCLIB/GitHub loads, and leave untimed Start at empty.
- Align existing lyrics automatically with AudioShake; remove Use existing lyrics. Keep translation and optional AI furigana with OpenAI. Map strict translation responses through short request-local IDs while preserving persistent lyric IDs.
- Support manual kanji annotations above kana through the shared project/catalog validator. Prevent original and translated captions from overlapping when wrapped text or ruby requires more space.
- Make Publish to GitHub primary, add a neutral Open in GitHub link between Publish and Delete, and show Open/Delete only for published translations.
- Check actual cached audio presence through the native helper. Disable Clear audio file when absent, refresh after deletion/download/video changes, and preserve active-task guards. Existing helper installations need the updated helper for this check.
- Review all Markdown files and walk through all 20 tutorial steps in Firefox, including highlighted targets, navigation, text-input arrow keys, Escape, and highlight cleanup. Verify audio cleanup availability with the cached file present, temporarily absent, and restored.
- Validation: 204 JavaScript tests, 29 Python tests and syntax checks pass. Ruff security rules pass for the native helper and MCP code. Mozilla’s add-on linter reports zero errors, warnings and notices for the release archive. Live MCP inspection/staging/audio tests preserve the existing 46-line project. No new paid API calls or authenticated GitHub writes were made during release preparation.
- Build both unsigned 1.5.0 distributions; verify ZIP integrity, exact runtime/helper/privacy files and version metadata. The release is not signed, uploaded or published. Full cross-platform playback acceptance and live MCP apply/publication remain separate validation work.

## 1.4.5 — Released 2026-11-19

- Harden the Linux native helper after a security review. Native messages must be JSON objects with strictly shaped request IDs, task receipts must be private regular files in a private user-owned directory, and malformed or oversized service responses are rejected before processing.
- Make helper installation and receipt persistence atomic. Existing helper destinations are replaced instead of followed, preventing symlink targets from being overwritten; installed directories and executables use `0700`, while helper source, manifests and receipts use `0600`.
- Review extension permissions, credential routing, external fetches, untrusted lyrics rendering, GitHub paths, native subprocess arguments, packaged contents and accidental-secret patterns. The application has no npm dependencies, so there is no third-party npm dependency tree to audit.
- Validation: 172 JavaScript tests, 20 Python tests, syntax checks and the Ruff security rules pass. Mozilla's add-on linter reports zero errors, warnings and notices for the packaged release. No live paid API request or authenticated GitHub write was performed.
- Built and verified `dist/runrun-karaoke-1.4.5.zip` and `dist/runrun-karaoke-1.4.5-local.zip`, including version metadata, ZIP integrity, exact runtime/privacy files and the hardened Linux helper. The packages are unsigned and have not been uploaded or published.

## 1.4.4 — Released 2026-11-13

- Place red Remove key buttons beside saved key fields and confirm credential removal. Keep Clear audio file neutral and immediate.
- Reuse validated per-video temporary audio for repeated AudioShake timing; add Clear audio file to remove the current cached download. Update helper and privacy documentation.
- Skip translation for lines already in the target language, and trim saved lyric/translation edges while preserving furigana and internal whitespace.
- Simplify Find lyrics to catalog or search choices, with search results shown only after searching. Move Clear all lines to the Line editor toolbar, hide it when empty, and keep its confirmation.
- Simplify developer GitHub controls to publication and confirmed deletion; show deletion only for a saved catalog match and keep cancellation silent.
- Keep one local translation per song. Changing Translation language code preserves its text until translation is regenerated; remove Add language and Saved translations. Importing or loading another language replaces the current translation after confirmation. Legacy multilingual projects use their selected language.
- Publish only the current translation to its own language file, preserving other GitHub language files such as en.json, fr.json and nl.json.
- Update the 20-step tutorial for current catalog/search controls, single-translation editing and audio cache reuse. Remove the Clear all lines tutorial step, keep catalog choices visible below the pinned header, and add left/right navigation and Escape to close. Editing fields retain normal arrow-key behavior.

- Validation: 172 JavaScript tests, 17 Python tests and syntax checks pass. Walked through the tutorial in Firefox, inspected all steps, verified left/right navigation and Escape, and rechecked the corrected catalog highlight and final 20-step count. The deeper tutorial review remains on the TODO list. Live AI requests and authenticated GitHub writes were not performed for this change.
- Rebuilt and verified the unsigned 1.4.4 and 1.4.4-local distribution archives, including exact runtime files, privacy policy and Linux helper contents. No upload or publication performed.

## 1.4.3 — Released 2026-11-12

- Bump the version after the duplicate private 1.4.2 upload was deleted; use 1.4.3 for the replacement upload because the deleted version number cannot be reused.
- Keep the functionality, project schema and privacy policy from 1.4.2 unchanged. Update manifest/package metadata, current-version documentation and packaging instructions.
- Validation: the unchanged runtime retains the 152 JavaScript and 9 Python tests passed for 1.4.2. Built and verified `dist/runrun-karaoke-1.4.3.zip` and `dist/runrun-karaoke-1.4.3-local.zip`: version metadata, ZIP integrity and bundled runtime, privacy policy and native helper match the source. These packages are unsigned and have not been uploaded.

## 1.4.2 — Released 2026-11-12

The duplicate private upload was deleted. This version is superseded by 1.4.3 and must not be uploaded again.

- Allow editing the current translation language code while preserving its text; reject language collisions and show a separate selector only for multiple saved translations. AI translations retain their chosen target language.
- Store multiple translation languages per video with separate original-language metadata, shared lyrics/timing and schema 4 display settings. Line editor and AI share a language selection, initially English and then the last manually chosen language. JSON preserves every language and merges compatible imports with overwrite confirmation; schemas 1–3 remain importable.
- Automatically load and save English from the configured catalog only for empty or verifiably unchanged projects. Preserve legacy projects, local changes and edits made during downloads. Find lyrics always offers catalog languages and LRCLIB/Genius search. Surprise Me never replaces local work, keeps Karaoke and Settings open, and manual navigation closes them.
- Use one repository and branch for catalog reads, Surprise Me, search and publication. Publish all local languages in one reviewed commit, preserving other remote languages and rejecting branch conflicts. Add separately confirmed remote deletion and clear repository/token errors. Local deletion removes the complete project and suppresses automatic loading until a manual load.
- Save separate original/translation visibility, size and placement in projects, JSON and GitHub. Confirm timing shifts affecting other lines, add Reset Start at, and reset the offset when replacing lyrics from search or LRC.
- Require a nonempty reading for kanji segments in the structured AI response, with explicit instructions and actionable line numbers when validation fails. Reproduced missing readings on `vSwxof0K8lk` using GPT-5.6 Terra; the corrected request returned all 41 translations and furigana and passed the editor/save flow without changing original text or timing. No automatic paid retries were added.
- Detect the original language in AI translation and offer saved, default-on Japanese romaji conversion without rewriting non-Japanese lyrics. Correct original-language metadata in existing local and GitHub projects, including Serbian lyrics previously marked as Japanese; preserve translation languages, text and timing.
- Expand and shorten the tutorial to 21 steps covering catalog choices, languages, audio recognition versus alignment, imports/exports and local deletion. Update the README, repository template, privacy policy and development guidance. Audio-based furigana correction remains a TODO; no such feature is included in this release.
- Validation: 152 JavaScript tests, 9 Python tests and JavaScript/Python/shell syntax checks pass. Earlier browser checks covered automatic catalog loading, multilingual imports and local deletion; the catalog metadata update's GitHub Action passed. Live extension-driven publication and remote deletion remain unverified.
- Built and verified `dist/runrun-karaoke-1.4.2.zip` and `dist/runrun-karaoke-1.4.2-local.zip`, including version metadata, ZIP integrity, exact runtime/privacy files and the native helper. The local archives are unsigned; the subsequent private upload was deleted.

## 1.4.1 — Released 2026-11-12

- Show GitHub publication confirmation inside Settings, with the exact destination, Confirm publication and Cancel controls. This avoids silently stopping when Firefox suppresses a browser confirmation dialog; project changes invalidate the reviewed upload.
- Show cancellation and upload errors beside the publication controls. Keep the reviewed destination and file revision, and reject changed projects before upload.
- Updated publication instructions in the main README, repository template and development guidelines. Existing projects and saved settings remain compatible.
- Validation: Firefox review and cancellation checked against the configured catalog without uploading; 127 JavaScript tests (including publication confirmation, cancellation, stale-review rejection and error recovery), 9 Python tests and syntax checks pass. Live upload and the resulting catalog Action remain a separate confirmation step.
- Built and verified `dist/runrun-karaoke-1.4.1.zip` and `dist/runrun-karaoke-1.4.1-local.zip`, including version metadata, ZIP integrity, native helper and the unchanged privacy policy. Packages are unsigned and have not been published.

## 1.4.0 — Released 2026-11-12

- Search now falls back from LRCLIB to Genius only when no usable lyric text is available. Results retain their provider and source link; blocked requests and network errors remain distinct from empty results.
- AI features combines translation and optional, default-on furigana in one OpenAI request with atomic validation and joint replacement confirmation.
- Added AudioShake line timing, recognition without a transcript, and realignment of existing lyrics for live performances/covers through Use existing lyrics. Results are staged for Apply/Discard; existing lyrics and annotations survive alignment. Interrupted requests resume the original task without automatic resubmission.
- Added a Linux native helper, dependency/protocol checks, verified distribution-specific installation guidance, cancellation and temporary audio cleanup. Keys and task state stay outside project exports.

- Added monthly cost estimates with per-month and per-model details, model-specific OpenAI token pricing and a configurable AudioShake credit price. The monthly total uses two decimal places; details retain four decimals and disclose unpriced requests.
- Expanded Advanced → AI features in the tutorial to cover translation/furigana, audio setup, generation and realignment, review/cancellation/resume, and costs. Keep field labels visible beneath the pinned header.
- Preserve the existing project format. API keys, usage records and native task state are excluded from project exports.
- Validation: 123 JavaScript tests and 9 Python tests pass, with JavaScript/Python/shell syntax checks. The Firefox/Linux route was exercised on video `F-iI4-BkwXg`; the user confirmed the 46 lines’ timing, English translation and Japanese furigana. Realignment preserved annotations and reset the global offset. All 18 tutorial steps were inspected with screenshots.
- Built and verified `dist/runrun-karaoke-1.4.0.zip` and the optional `1.4.0-local` variant, including the Linux helper archive and exact bundled privacy policy. Packages are unsigned and have not been published.

This file tracks release status and planned scope. Planned features are not a record of completed work.

## 1.3.2 — Released 2026-09-15

- Open **Find lyrics** by default when the current video has no saved lyric lines, while leaving it closed for projects that already contain lyrics.
- Add the pink **Surprise Me** header button and a Basics tutorial step. It chooses a random different video from the translations catalog, checks shuffled unique candidates with YouTube, skips removed videos, and stops after every candidate has been tried. The button stays hidden when no alternative is available or the catalog cannot be read.
- On April 1, make the first **Surprise Me** click of each year open `668r-uYMFfA`; remember that year locally and use normal catalog selection for subsequent clicks until the next April 1.
- Restore use of saved GitHub credentials for repository inspection and publication by removing the temporary token-disable switch.
- JavaScript syntax checks and all 100 automated tests pass. The unsigned private-development and public-distribution configurations share this version; full Firefox acceptance testing remains outstanding.
- Built `dist/runrun-karaoke-1.3.2.zip` and verified ZIP integrity, manifest version 1.3.2 and an exact bundled copy of the updated privacy policy. The package is unsigned and has not been published.
- Added a reproducible `npm run package:local` target and built `dist/runrun-karaoke-1.3.2-local.zip` with display version `1.3.2-local` and Firefox internal version `1.3.2.1`.

## 1.3.1 — Released 2026-09-14

- Trim leading and trailing whitespace, including blank lines, from video and project titles when creating, importing and saving projects.
- Keep the repository template's core validator aligned with the extension. At release time, JavaScript syntax checks passed and 94 of 95 tests passed; authenticated publication was still disabled by a temporary local testing switch. Full Firefox acceptance testing remained outstanding.
- Built `dist/runrun-karaoke-1.3.1.zip` and verified ZIP integrity, manifest version and bundled runtime files. The package is unsigned and has not been published.

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
- Synchronize the repository template’s core copy. At release time, JavaScript syntax checks passed and 90 of 92 tests passed because authenticated publication was still disabled by a temporary local testing switch. Full Firefox acceptance testing remained outstanding.
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

- Complete Firefox acceptance coverage, including all display modes, shortcuts, and playback scenarios beyond the Firefox/Linux checks recorded for 1.4.0.
- Validate timing for the Japanese live reference performance with English translations.

## Future audio analysis — Unscheduled

Built-in automatic word alignment and further audio-analysis options, beyond the AudioShake line timing and the progressive highlighting/editor delivered in 2.0.0.

### Scope

- A verified audio input route and a processing architecture selected through prototyping.
- Alignment of existing lyrics with the actual performance.
- Line and segment timestamps, with uncertain passages flagged for review.
- Analysis progress, cancellation, error handling, and manual correction.
- Preservation of translation mappings and existing manual edits.

### Validation goals

Complete the future automatic audio-analysis acceptance criteria in [agents.md](agents.md). Measure alignment accuracy against manually annotated passages and establish a quality threshold after the prototype. Verify that cancellation, failure, and migration preserve existing work.

## Release maintenance

When a version is released, replace its planned status with its release date and describe only delivered functionality. Move unfinished scope to a future section. Record relevant fixes, compatibility changes, and migration requirements with each release.
