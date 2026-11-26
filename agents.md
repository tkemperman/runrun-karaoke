# ルンルンKARAOKE — Development Plan

## Project language

Use English for source code comments, identifiers, documentation, commit messages, and default interface text. Preserve lyrics, translations, artist names, and song titles in their original languages. The add-on is intended for public distribution.

Keep the user-facing brand exactly `ルンルンKARAOKE`; technical package names may retain `runrun-karaoke`.

## Current scope decision

Use **AI features** for optional OpenAI translation with a saved, default-on Generate furigana checkbox in one request, with persistent local API key, provider, model, and target language preferences. Use strict JSON output mapped by block ID; preserve existing work on invalid or stale responses and confirm replacement. Manual translation happens per line in **Line editor**, using **Add line before / Add line after** on each row for new lyrics (**Add first line** when empty); do not restore the separate Manual translation box. Keep project JSON and timed/untimed LRC import/export. JSON preserves the complete project; LRC exports original lyrics only. Timed LRC includes the project offset and requires all lines to be timed. Explain file import/export in the tutorial; omit a separate step about writing new lyrics and manual translations, since the editing controls make this clear. Do not reintroduce MyJpop fetching. Artist alias lookup uses explicit spellings and does not translate text.

## GitHub lyrics repositories

- Keep **Lyrics repositories · GitHub** hidden for normal users. It is a developer-only section, excluded from the tutorial (including catalog setup, searching, and publishing steps).
- The visibility flag is `runrunKaraoke.developerMode` in `https://www.youtube.com` localStorage. Only the exact string `"true"` enables it; missing, `"false"`, or unavailable localStorage keeps it off. Leave it off by default for testing.
- Enable from the YouTube page console with `localStorage.setItem("runrunKaraoke.developerMode", "true")`, then reload the page. Disable with `localStorage.setItem("runrunKaraoke.developerMode", "false")`, then reload. This is a UI visibility preference, not an authorization boundary.
- Hiding the section must never clear or reset repository preferences, branches, saved GitHub tokens, or other stored settings. Re-enabling it restores access to the existing configuration.

- Use one configured public repository and branch for reading and publishing. Public English auto-loading is permitted only for pristine projects; developer writes remain user-triggered. Always preserve local edits and offer both manual catalog loading and LRCLIB/Genius search.
- Keep **Surprise Me** available to normal users as a pink header button immediately after Tutorial. It chooses a random different video from the configured translations catalog, deduplicates video IDs, shuffles candidates, checks each candidate with YouTube at most once, and skips 404 responses. Hide it silently when no alternative is available, the retrieval repository is missing, or the catalog cannot be read. On April 1, the first click per calendar year opens video `668r-uYMFfA`; store only the completed year locally, then resume normal selection until the next April 1. Do not expose developer repository configuration in the tutorial; describe Surprise Me only as random discovery from the translations catalog.
- Manage the GitHub token only through extension Settings and background storage. Never return it to content scripts or the Settings frame, or put it in project payloads. Clear the token input when submitted and show only saved-token status; leaving it empty preserves the saved token, while Clear token explicitly removes it. Public reads are anonymous.
- Upload paths use `translations/SANITIZED_VIDEO_TITLE-VIDEO_ID/LANGUAGE.json`; preserve Unicode letters and keep video ID as the matching key regardless of title changes.
- Use the existing project schema and a separately versioned `index.json` catalog. Match exact video IDs for loading. Keep catalog loading under Find lyrics; do not show repository filter fields, search or load controls in the developer GitHub section.
- Confirm project replacement and publication destinations. GitHub publication uses an inline Settings review showing repository, branch and file path with Confirm publication and Cancel; do not use a browser confirmation dialog for this action. Reject project or video changes between review and confirmation, keep upload errors and cancellation visible beside the controls, and use the reviewed GitHub branch revision to detect conflicting uploads. Reject stale downloaded projects after local edits.
- The standalone `lyrics-repository-template/` includes the index Action. Keep its validator copies aligned with `src/core.js` and `src/repositories.js`; regression tests enforce this. Do not bundle the template in the extension archive.

## Implemented project and catalog behavior

- One project per video ID stores the original language, lyrics/timing and one local translation. Schema 5 preserves display settings and progressive highlighting; schemas 1–4 remain importable. The editor and AI share the selected language, initially `en`, then the last manually chosen language. Translation language is a text input that relabels the current translation while preserving its text; regenerating the translation replaces its text after confirmation. Do not show Add language or Saved translations. Legacy multilingual projects load their selected language. AI output already carries the chosen target language. Automatic catalog loading always chooses English.
- One configured repository/branch serves the catalog, Surprise Me and developer publication. Default to `tkemperman/runrun-karaoke-lyrics-catalog`, `main`. Keep credentials private in the background. Missing repository/token, invalid token, permission failures and network errors remain distinct. No automatic fork/PR or managed contribution service.
- On opening a video, load its local project first. Only empty or verifiably unchanged projects can automatically load English from the catalog. Existing legacy local projects are treated as user work. No English means no automatic replacement. Surprise Me must never replace local edits. Compare storage revisions and reject stale asynchronous results.
- Find lyrics offers catalog or search when catalog translations exist; otherwise only search (LRCLIB, Genius fallback). Manual imports/catalog loads replace the current translation when original lyrics match; confirm overwrites. Manual catalog loads also use the full-project import review for timing, furigana and display settings, restoring the catalog offset even when the lyric text matches. Refresh Start at after LRCLIB or GitHub loads; show the first timed lyric including its loaded offset, or leave it blank for untimed lyrics. Differing original lyrics require explicit full replacement or cancellation. JSON preserves the current translation and its language, timing, furigana and display; LRC contains original lyrics only.
- **Clear all lines** is a red button at the top of **Line editor**, hidden when no lines remain and excluded from the tutorial. It confirms removal of all lyric lines, translations, timing and furigana, resets offset and source, preserves display and language settings, and suppresses automatic loading across visits until a manual load. Invalidate queued writes. The developer GitHub action row contains the primary blue **Publish to GitHub** button, a neutral **Open in GitHub** link styled as a button, and a red **Delete from GitHub** button. Open in GitHub opens the published file for the current video and language in a new tab, using the catalog destination or the just-published destination. Show Open in GitHub and deletion only for a known published translation. Cancellation is silent. Deletion targets the current video and selected translation language, confirms repository, branch and file with a browser confirmation, and checks the reviewed revision; preserve the local project.
- Publish only the current translation to its language file (en.json, fr.json, nl.json, etc.) in one reviewed commit. Preserve other remote languages and reject changes to the reviewed branch. Developer GitHub controls start expanded only when the active translation is not published; failed catalog checks do not establish absence.
- Surprise Me keeps Karaoke and Settings active, except for the existing April Fools behavior. Manual navigation disables Karaoke and closes Settings. Loading project data does not activate Karaoke.
- Confirm manual shifts affecting subsequent timed lines. Reset the global offset when replacing lyrics from search/LRC; JSON restores its own offset. The cross inside Start at sets the first lyric to 0:00 using the same timing logic as entering 0:00 manually; preserve relative timing between lines.
- Store original/translation visibility and separate text size and vertical placement locally and in JSON backups. GitHub publication includes only sweepColor from display settings; omit all other display preferences. AI detects original language; romaji-to-kanji/kana conversion is a saved, default-on option restricted to Japanese romaji.
- Caption spacing runs from 0–30% of video height. Zero (the leftmost/default value) tightly fits the rendered text bounds, including ruby and next-line text, without padding creating an artificial gap. The lower caption anchors the pair; move the upper caption in either direction to enforce the exact gap, preserving saved position values and configured order. Remeasure after text, size, visibility and viewport changes. Composite caption backgrounds as opaque shapes within one transparent layer so overlap never darkens.
- Generate timed lyrics automatically aligns existing lyrics when present and recognizes the actual recording when there are no lyrics. Do not show a Use existing lyrics checkbox. Explain this automatic choice in the tutorial. Do not add a separate trimming/adaptation feature.

## TODO

- [x] Review all 20 tutorial steps in Firefox for 1.5.0: targets, current wording, navigation, input arrow keys, Escape and highlight cleanup. Paid generation is not triggered during walkthroughs.
- [ ] Investigate built-in automatic furigana correction from sung audio, beyond the agent-led fix-lyrics review workflow; AudioShake's public API currently has no documented kana-reading or phoneme output. Discuss the approach before implementation.

## Deferred scope

Direct source pasting, click-based timing, Surprise Me language filters, separate locale/fallback preferences, abuse reporting, multiple repositories, fork/PR automation and managed public contributions are not planned for this iteration. Do not reintroduce the removed managed-service privacy draft.

## Objective

Build a Firefox add-on that displays synchronized lyrics alongside YouTube videos. Show the original text above its corresponding translation. Fully support Japanese kanji and kana. Allow lyrics, translations, and timing to be edited independently.

## Reference performance

- Song: Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆ / Ahoy!! 我ら宝鐘海賊団☆.
- Special live performance: https://www.youtube.com/watch?v=h3chCOV_phw
- Initial English translation source: https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/
- The exact performance, available lyrics, and timing have not yet been verified. Do not assume studio timing matches this video.
- Use this performance to validate Japanese text, English translations, changes in live song structure, and video-specific timing.

## Shared architecture

- `src/bootstrap.js` mounts the Karaoke and Settings buttons and initializes core, tutorial and editor scripts when a watch video is opened, enabling automatic project/catalog loading without turning Karaoke on or opening Settings. Keep concurrent initialization requests sharing one load and allow retry after failure. Start the first-visit tutorial only after Settings is opened.
- A content script manages the overlay and follows the YouTube player's playback position.
- A background component handles external source requests and local storage. Request only necessary extension permissions and access to source hosts in use.
- Keep Firefox's `data_collection_permissions` declaration aligned with outgoing data: LRCLIB search terms, website content used in search, translation and AI furigana generation, and the OpenAI authentication key. The current manifest declares these as required installation consent; opening a video triggers the public catalog check, even while Karaoke and Settings are closed; other network features remain user-triggered. Require Firefox 142 or newer so the minimum version supports built-in consent on both desktop and Android. Do not declare Android compatibility without verifying the Android interface and playback workflow.
- Separate rendering, player integration, source providers, translation mapping, and timing editing.
- Use the player's current playback position as the clock to avoid accumulated drift when pausing, seeking, or changing playback speed.
- Store customized performances by YouTube video ID. Keep retrieved source data separate from user corrections so refreshing a source does not overwrite edits.
- Each text block has a stable ID, start and end times in seconds, original text, translations keyed by language, and optional furigana segments. Repeated lines have separate blocks.
- Project schema 5 metadata includes `videoId`, its canonical `videoUrl`, the original unsanitized `videoTitle`, lyric title, artist, languages, one `source` object (provider and URL) or null, timing offset and furigana visibility. Derive URLs from video IDs; capture video titles from the matching watch page. Migrate older source arrays using only their last entry.
- Editing an individual line start shifts its end and all following rows by the same delta after confirmation. Preserve untimed values; initial timing has no previous delta. Validate the whole shift before applying it.
- Do not show a separate Delay in seconds field. Use Start at and Sync with video position for global timing; preserve stored project offsets and continue applying them internally.
- Line editor Start and End inputs use minutes:seconds with optional milliseconds (for example `3:32.250`), not raw seconds. Use the labels **Start** and **End** without a format suffix, and `0:32.250` as the placeholder for both fields. **Start at** has no placeholder. Blank fields remain untimed.
- Stored block times exclude the global offset. Overlay selection and Line editor display use video time (`block time + offset`); convert edited video times back to stored times. Apply the offset exactly once and test exact start/end boundaries.
- Version the storage and export schema and provide migrations when it changes.
- Support empty intervals for instrumental passages and additional blocks for live interludes.

### Lyrics sources and manual translations

- Find lyrics shows **Use lyrics translation from catalog** or **Search for lyrics** as mutually exclusive choices only when exact-video catalog translations exist; otherwise show only the search form. Place the catalog load button directly below its radio option, then a horizontal “or” divider and the search option. Keep catalog controls visible but disabled while search is selected; show the search form for that selection. Do not show a manual catalog refresh button. Show a language selector only for multiple catalog translations, defaulting to English when available. Keep LRCLIB/Genius search available as the alternative. Open the section by default when the loaded project contains no lyric lines, and default it closed when lyrics already exist without overriding later user toggles. Use synchronized lyrics when available; do not assume complete catalog coverage.
- Search explicit artist aliases and extracted song titles; keep manual recording selection and query correction available.
- Track search edits per video: an untouched query follows that video's title, while a manually edited query is persisted under `lyricsSearch:<videoId>` and restored on reload or return. Reset in-memory search state on navigation and guard asynchronous restores against stale video results. Always show the current YouTube title in the editor header, without appending the video ID.
- Keep source retrieval separate from rendering and timing logic. Request only permissions for sources in use.
- Local project JSON file imports do not require a matching video. Load the imported lyrics, translations, furigana and timing for the current video, replacing videoId, videoUrl and videoTitle with the current video metadata. Keep replacement confirmation and stale-import protection. Repository catalog matching remains separate.
- Support LRC or project JSON file import under **Import / export** when sources are unavailable. Do not show a bulk lyrics paste field or describe pasting in the tutorial. Manual entry uses Add line before / Add line after per row in Line editor, with Add first line only when empty.
- Enter manual translations in each Line editor row, creating rows with Add line before / Add line after (Add first line when empty). Preserve original text, timing, and the current translation.
- Save per-line translations locally as they are edited.
- Display source links. Treat retrieved content as untrusted text; never execute source HTML or scripts.

### Furigana (1.1.0)

- **AI features → Generate furigana** is a saved checkbox included in the translation request, using the full original song as context with the existing saved key and model. Keep the key in the background; do not include it in project exports. No audio is sent or analyzed. Explain API billing and that contextual readings still need review.
- Keep local EDICT2/ENAMDICT generation as the option without an API key under **Display & timing**, with the button below the dictionary credits. Cache dictionaries in IndexedDB and retain Furikazan/EDRDG attribution.
- **Show furigana** controls ruby for both current and next original lyric lines. Generation enables it; toggling it alone must not trigger downloads or API requests.
- Store `furigana` as ordered `[text, readingOrNull]` segments and `furiganaEnabled` at project level in JSON schema 5 (introduced in schema 2). Validate exact text reconstruction and kana readings, allowing manual kanji annotations above kana text as described below. Migrate schema 1 without modifying the input. Keep application version and project schema version separate.
- Render matching leading kana and okurigana outside ruby. Keep compound/name readings together when appropriate. Dictionary imperative handling must work for cached entries and avoid superseded rare readings.
- Support manual reverse ruby: kana original text may have a Japanese annotation containing kanji, displayed above it by the existing ruby renderer and preserved in JSON. Keep automatic AI generation restricted to kana readings. Do not accept markup or arbitrary text as annotations.
- Put **Correct a term throughout this song** in its own section directly above **Line editor**. Per-line shortcuts open that section. Apply exact term corrections to every occurrence in the current project, merging split segments; leave cut fragments of longer words unannotated for review. Generate missing annotations locally before applying corrections. Do not imply these edits are global or persistent dictionary rules.
- Confirm replacement of existing furigana, including manual corrections. The dictionary button becomes **Re-generate furigana (dictionary)** when annotations exist. Show a spinner and disable the active button until completion or failure.
- Require nonempty kanji readings in the structured AI response, while allowing null only for segments without kanji. Keep local validation authoritative and identify affected line numbers on missing readings. Never automatically retry paid requests.
- Validate every result before applying any update. Reject stale results after navigation, project replacement, original-text edits or furigana edits. Preserve lyrics, translations and timing. Editing a lyric clears its annotations; repeating a line copies them.
- Send short request-local line numbers to OpenAI, constrain the permitted IDs and exact line count in the response schema, and restore persistent project IDs only after validation and ordering. Never guess mappings from lyric text or response order; repeated lines must remain distinct. Test malformed, incomplete and refused AI responses, unknown/duplicate IDs, altered text, invalid/missing readings, saved-key routing, and JSON round trips. Mocked API tests do not establish pronunciation quality or live API compatibility.

## Version 1.x — Line-based karaoke

### Features

1. Detect the active YouTube video and derive an initial search from available title metadata. Allow manual artist and title corrections.
2. Search LRCLIB, then Genius only if no usable lyric text is found, and let the user select a suitable recording. Rank title and explicit artist-alias matches; let the user choose because live and studio versions may differ.
3. Import LRC files and accept manually entered lyrics. Unsynchronized lyrics require timing edits before synchronized playback is possible.
4. Create lines and enter manual translations in Line editor. Display original lyrics with the selected translation underneath, changing together as one block.
5. Provide a readable overlay showing the active line and optionally the next line, with visibility, text size, vertical placement, and fullscreen controls. Center both languages inside the YouTube player.
   - Toggle subtitles with a configurable shortcut, default `Alt+K`, or a microphone Karaoke button injected after `[data-yt-extension="transcript-copier"]` in `ytd-watch-metadata #owner`. Use the supplied microphone image as a 19×19 monochrome mask. Add an adjacent gear button that toggles the lyrics and timing settings open or closed. Opening Settings (gear, shortcut, toolbar, or preferences) automatically enables Karaoke; closing Settings never disables it. Keep the explicit Karaoke toggle available to turn it off. Fall back to the end of the owner row when Transcript tools are absent.
   - The extension toolbar icon and Firefox extension preferences open the same in-video Settings panel as the gear. Keep all preferences there; GitHub credentials use an isolated extension-origin frame styled like AI translation. Configure the activation shortcut through Firefox’s own extension shortcut manager. Do not add a separate preferences popup or an intermediate on/off menu.
   - Keep button and shortcut state synchronized. New tabs start with karaoke off; activation is per tab.
6. Provide an earlier/later timing offset saved per video.
   - **Start at** shows the earliest timed, non-empty lyric's video start in minutes:seconds. Editing it calculates the global offset from the stored start. If no lyric is timed, it sets the first non-empty line’s start. Show yellow warnings for untimed recording selections and remaining untimed lyrics.
   - Place a cross that applies Start at = 0:00 inside the right edge of the Start at field, and **Sync with video position** immediately to its right, vertically aligned with the input. Do not show a separate Reset Start at button or an “or” separator. Sync anchors the selected timed line to the current video position, preserving milliseconds and relative timing. For an untimed selected line, set its start without shifting other lines.
   - Refresh Line editor's displayed start/end video times after offset changes. Synchronization does not enable karaoke automatically or change whether the video is paused or playing. Keep editor pointer and keyboard events from bubbling to YouTube, including inside the fullscreen player.
7. Build a timing editor with Start and End inputs in minutes:seconds. Do not show Mark line now or End previous line now buttons; the tutorial explains editing these time fields. Retain the existing timing keyboard shortcut. Allow subsequent start/end edits and inserting, deleting, repeating, and moving blocks. Do not trigger shortcuts while typing in text fields.
8. Allow lyrics and translation edits without re-entering timing.
9. Save projects and corrections locally. Support JSON export/import preserving the current translation, display settings and timing. Retain LRC import; LRC alone is insufficient for a complete bilingual project.
10. Provide useful feedback for missing lyrics, missing translations, network failures, and invalid imports. Preserve existing work when errors occur.
11. Keep automatic translation optional. Immediately disable **Translate all lines** and show a spinner while a request runs; prevent duplicate submissions and restore the button on completion or failure. Discard results if the video, project, source text, target language, or relevant translations changed during the request.

### Implementation sequence

1. Extension scaffold, player integration, and overlay. Keep short original sample text in test fixtures only; do not reintroduce a demo button or demo-loading instructions.
2. Data model, local storage, JSON import/export, and LRC parsing.
3. LRCLIB adapter, search interface, and recording selection.
4. Manual per-line lyrics and translation editing.
5. Timing editor and video-specific corrections.
6. Synchronize the reference performance in the browser and verify the complete workflow.

### Acceptance criteria

- The correct English passage appears beneath each corresponding Japanese block in the reference performance.
- Timing matches the live performance, with editable introductions, repetitions, and interruptions.
- Pausing, seeking in either direction, changing speed, and fullscreen preserve synchronization.
- Navigating between YouTube videos without a page reload clears old content and loads the appropriate project.
- Reloading preserves text corrections, translation mappings, and timing.
- Search edits survive reloads within their video; navigating to a video without a saved query picks up its title.
- Start at and selected-line synchronization calculate the offset correctly, refresh displayed editor times, and activate lyrics at the exact adjusted start when karaoke is enabled. Selected-line sync preserves milliseconds and also initializes untimed lines.
- Export followed by import preserves the current translation and its language, display settings, block order, the current source, original video metadata, timestamps, furigana segments, and visibility. Schema 1, 2 and 3 imports remain supported.
- Both furigana methods support review in Line editor and song-wide term correction. Verify spinner/disabled state, replacement cancellation, stale-result protection, and current/next-line ruby in Firefox.
- Manual translation through Line editor preserves original lyrics, timing, and other translation languages; JSON and LRC import/export remain available.
- Use focused tests for parsing, time selection, import validation, and storage. Manually verify rendering and player interaction in Firefox.

### Out of scope

- Built-in automatic word alignment remains future work. Agent-authored progressive highlighting is implemented through MCP and the add-sweep skill.
- Automatic translation through a mandatory custom backend.
- A mandatory backend, user accounts, and cloud synchronization.
- YouTube captions as a required source; these may be investigated later as an additional provider.

## Future automatic audio analysis and word timing

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

## Progressive highlighting

- Schema 5 adds optional `block.sweep` segments `{text,start,end}`. Segment text reconstructs the line exactly and uses the same project-relative clock as block timing. Preserve legacy projects, JSON/catalog round trips and ruby; LRC remains line-only.
- The `add-sweep` skill and MCP `stage_sweep` / `apply_sweep` reuse track preparation/listening. They reuse correct existing lyrics and sweep idempotently, or create/correct lyrics and translations when missing or wrong. Identical proposals do not write or increment revisions. Requested local sweep application needs no extra approval; publishing and cleanup remain separate.
- Render from the media clock on animation frames. Invalidate sweep after text changes or replacement alignment, and shift segments together with manual line-start edits.

## Working practices

- A local **runrun-karaoke MCP server** is available in `mcp/server.py`, connected to Firefox through `mcp/bridge.py` and `src/mcp.js`. Install with `python3 mcp/install.py`; see `mcp/README.md` for registration, tools, and troubleshooting. Use this integration for project access and audio review instead of reading Firefox profile databases or exposing API keys. The discoverable **fix-lyrics** skill lives in `skills/fix-lyrics/SKILL.md` (installed in the personal skill directory).
- The fix-lyrics workflow checks for existing lyrics, listens to the recording (reusing or downloading/extracting audio), and optionally consults LRCLIB as reference; live performance variations take precedence. Include missing lines and update translations in the configured target language and Japanese furigana. Always show the proposed timestamp / original text + translation / new text + translation table before applying. Apply only after the user approves that proposal; ask separately before publishing lyrics/translation to GitHub and before cleaning up audio/intermediate artifacts. Never interpret lyrics publication as permission to commit extension source. Preserve recovery data and reject stale project/repository revisions.

- Before every commit, review all Markdown files in the repository and update them wherever needed to reflect the changes being committed. Also walk through the complete tutorial in the running extension and test that its instructions, targets and interactions still match the changed behavior. Correct any discrepancies before committing; automated tests alone do not replace this walkthrough.
- Bump the application version only when add-on functionality changes in a way relevant to users, including user-visible fixes. Packaging, build tooling, tests, documentation, skills and repository instructions alone do not require a version bump. Before committing, verify that the manifest, package metadata and release documentation agree on the version; complete a missing bump only when the functional-change rule requires it.
- Build only the public distribution with `npm run package`, and verify that the archive in `dist/` contains the current source and correct version metadata before committing. Do not create local variants: the public distribution is also used locally. After a successful build, keep at most the three newest release versions in `dist/` (the latest plus two previous versions), ordered by numeric version; remove older release ZIPs and obsolete `-local.zip` variants. Preserve unrelated files.

- The current version is `2.0.0` (released November 25, 2026). `1.5.2` was released November 25, 2026. `1.5.0` was released November 20, 2026. `1.4.5` was released November 19, 2026. `1.4.4` was released November 13, 2026. `1.4.3` was released November 12, 2026 to replace the deleted private `1.4.2` upload, whose version number must not be reused. `1.4.2` was released November 12, 2026; `1.4.1` was also released November 12, 2026; `1.4.0` was also released November 12, 2026; `1.3.2` was released September 15, 2026; `1.3.1` and `1.3.0` were released September 14, 2026; `1.2.0` and `1.1.1` were released September 12, 2026; `1.1.0` was released September 11, 2026; `1.0.0` was released on September 10, 2026. Treat every requested version bump as a release by default, dated on the day of the bump, unless the user explicitly specifies otherwise. Do not label it "Local build" or ask for separate release confirmation. Keep manifest, package metadata, package instructions, and release notes consistent. Private developer controls and the public interface share one application version; developer mode only changes visibility. Release status does not imply that the add-on has been signed or published to an external service. The user will commit when the add-on works sufficiently well; do not create commits unless explicitly asked. A release does not imply that all acceptance criteria have passed.

- The current user-approved AudioShake integration uses line timing with a Linux native helper. Keep this separate from future word-level highlighting and local audio analysis.
- Verify source availability and the reference video during implementation. Do not claim successful synchronization without checking the actual performance.
- Use short original text in automated test fixtures; avoid unnecessarily bundling source lyrics with the extension.
- Keep changes small and verify each milestone against its acceptance criteria.

## Current editor controls

- Keep the Settings header compact in every view: 12px visible space above the header controls, with the same title and button positions before and after scrolling. The sticky header background must cover the panel’s top padding so scrolling text cannot appear above the title. Place Close beside the title and Tutorial, Surprise Me, Privacy Policy and About on the row below. Privacy Policy toggles an inline section in the Settings panel, loading the bundled `privacy.md`; keep that file included in the extension archive. Keep the inline privacy policy and the external `privacy.md` file in sync: `privacy.md` is the single source of truth, and the inline view must render that bundled file without duplicating or omitting policy text. After policy changes, rebuild the extension package and verify its bundled `privacy.md` matches the source file. Its title and right-aligned Close button share a fixed header above an independently scrolling policy body; keep both visible while reading. About toggles an inline section with ルンルンKARAOKE, the installed manifest version, © 2026 Thomas Kemperman, and thomas@silverwoodslabs.com linked using mailto with subject ルンルンKARAOKE. Use only About and Privacy Policy as the respective inline headings, without the brand suffix; keep the privacy heading in `privacy.md` consistent. About uses the same fixed title and right-aligned Close header with an independently scrolling body as Privacy Policy. Opening About or Privacy Policy closes the other section. Tutorial is text-only; retain assets/tutorial-video-reserve.svg. Show the selected-line highlight only during the tutorial.
- Each line has Add line before / Add line after, Jump to, reorder, Repeat and Delete. Show Add first line only when empty. Jump to seeks to the start plus offset without changing paused state. Delete confirms only for lines containing lyrics, translations, furigana or timing.

## AudioShake timing

Keep Clear audio file disabled when no cached audio exists for the current video; query the helper rather than inferring presence from task history. Refresh after cleanup, video changes and background audio downloads. Preserve the temporary busy/running-task guard.

Keep paid generation explicit. Generate timed lyrics can transcribe or align existing lyrics. Automatically align when the project contains non-empty lyrics; otherwise transcribe. Alignment also recalculates existing timing for the current video, preserving text, IDs, translations and furigana. Keep one generation button; do not add a separate Fix timing action. Stage results for Apply/Discard, reject stale projects, validate finite video duration up to 45 minutes, and reset the offset on Apply. Keep native task IDs/receipts outside project exports; Resume must never create a second paid task. The Linux installer prints verified system commands and never invokes sudo.

Progressive highlighting defaults to pink. **Display & timing → Highlight color** saves a per-video color (`display.sweepColor`, a six-digit hex color), preserved in JSON and catalog projects.

Display settings include per-video `lyricsColor` (white), `translationColor` (light blue), `sweepColor` (pink), and a `captionGap` slider (0–30%, default 0%). Swept text transitions from the chosen original color to the highlight color; ruby and next-line previews retain the original color.

Line editor has a per-line Progressive highlighting segment editor. Add timing row / Add after / Remove edit a draft with exact text and video-time Start/End. Apply timing validates all rows atomically; empty drafts remove only sweep. Reset changes reloads saved data. Preserve drafts through editor redraws, reject stale lyric/timing bases, and block MCP snapshots/reloads while drafts are dirty. Do not invent word timing or silently modify original lyrics to match draft segments. Drafts are local to the open tab and must be applied before a page reload.

GitHub publication keeps only `display.sweepColor`; omit lyrics/translation colors, sizes, positions, spacing and visibility. Keep all display settings in local storage and JSON backups. Preserve PH segment timing, lyrics, translations and furigana in published projects. Read older catalog files compatibly; omitted display values use schema defaults.
