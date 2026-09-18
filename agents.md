# ルンルンKARAOKE — Development Plan

## Project language

Use English for source code comments, identifiers, documentation, commit messages, and default interface text. Preserve lyrics, translations, artist names, and song titles in their original languages. The add-on is intended for public distribution.

Keep the user-facing brand exactly `ルンルンKARAOKE`; technical package names may retain `runrun-karaoke`.

## Current scope decision

Use **AI translation** for optional OpenAI translation and contextual furigana generation, with persistent local API key, provider, model, and target language preferences. Use strict JSON output mapped by block ID; preserve existing work on invalid or stale responses and confirm replacement. Manual translation happens per line in **Line editor**, using **Add line before / Add line after** on each row for new lyrics (**Add first line** when empty); do not restore the separate Manual translation box. Keep project JSON and timed/untimed LRC import/export. JSON preserves the complete project; LRC exports original lyrics only. Timed LRC includes the project offset and requires all lines to be timed. Explain file import/export in the tutorial; omit a separate step about writing new lyrics and manual translations, since the editing controls make this clear. Do not reintroduce MyJpop fetching. Artist alias lookup uses explicit spellings and does not translate text.

## GitHub lyrics repositories

- Keep **Lyrics repositories · GitHub** hidden for normal users. It is a developer-only section, excluded from the tutorial (including catalog setup, searching, and publishing steps).
- The visibility flag is `runrunKaraoke.developerMode` in `https://www.youtube.com` localStorage. Only the exact string `"true"` enables it; missing, `"false"`, or unavailable localStorage keeps it off. Leave it off by default for testing.
- Enable from the YouTube page console with `localStorage.setItem("runrunKaraoke.developerMode", "true")`, then reload the page. Disable with `localStorage.setItem("runrunKaraoke.developerMode", "false")`, then reload. This is a UI visibility preference, not an authorization boundary.
- Hiding the section must never clear or reset repository preferences, branches, saved GitHub tokens, or other stored settings. Re-enabling it restores access to the existing configuration.

- Currently support a single configurable public retrieval repository and a separate upload repository, each with an explicit branch (default `main`). See the TODO below for planned multiple retrieval sources and publication destinations. Developer repository actions remain user-triggered. Opening Settings automatically checks the public tkemperman/runrun-karaoke-lyrics-catalog (main) under Find lyrics for exact YouTube-ID matches. Offer explicit loading with replacement confirmation and stale-edit protection; always retain LRCLIB search as an alternative. This public lookup is available outside developer mode and does not change repository preferences.
- Keep **Surprise Me** available to normal users as a pink header button immediately after Tutorial. It chooses a random different video from the configured translations catalog, deduplicates video IDs, shuffles candidates, checks each candidate with YouTube at most once, and skips 404 responses. Hide it silently when no alternative is available, the retrieval repository is missing, or the catalog cannot be read. On April 1, the first click per calendar year opens video `668r-uYMFfA`; store only the completed year locally, then resume normal selection until the next April 1. Do not expose developer repository configuration in the tutorial; describe Surprise Me only as random discovery from the translations catalog.
- Manage the GitHub token only through extension Settings and background storage. Never return it to content scripts or the Settings frame, or put it in project payloads. Clear the token input when submitted and show only saved-token status; leaving it empty preserves the saved token, while Clear token explicitly removes it. Public reads are anonymous.
- Upload paths use `translations/SANITIZED_VIDEO_TITLE-VIDEO_ID/LANGUAGE.json`; preserve Unicode letters and keep video ID as the matching key regardless of title changes.
- Use the existing project schema and a separately versioned `index.json` catalog. Match exact video IDs for loading; title/artist filtering can discover other performances without reusing their timing automatically.
- Confirm project replacement and publication destinations. Reject stale downloaded projects after local edits and use the reviewed GitHub file SHA to detect conflicting uploads.
- The standalone `lyrics-repository-template/` includes the index Action. Keep its validator copies aligned with `src/core.js` and `src/repositories.js`; regression tests enforce this. Do not bundle the template in the extension archive.

## TODO

- [ ] Check how AI translations are being handled: does it hardcoded say "translate from Japanese to target language", or does it say: "detect source language and translate to target language"?
- [ ] When found lyrics are longer than the video, offer an option to trim the lyrics.
- [ ] Remember text size and distance from the bottom for the translation itself, including in exports.
- [ ] Allow users to show or hide the original lyrics and the translation independently.
- [ ] Add a **Report abuse** button for lyrics loaded from the shared catalog so users can directly report vandalism or other inappropriate content. Allow an optional explanation and show confirmation after submission. Include the catalog repository, file/language, video ID, and loaded revision so maintainers can identify the reported content even if it later changes. Send reports to a private maintainer review queue without requiring a GitHub account; apply rate limits and duplicate handling to prevent report spam. Reports must not automatically delete lyrics or ban contributors: let maintainers inspect the content and use the contribution service's review/ban controls when appropriate. Explain report data and retention in the privacy policy before enabling reporting.
- [ ] Allow users to add multiple GitHub repositories as retrieval/search sources and multiple publication destinations, selecting a destination for each publication.
- [ ] Include `tkemperman/runrun-karaoke-lyrics-catalog` as both a default search source and the default publication destination.
- [ ] For destinations outside the managed shared catalog, automatically choose direct publication when configured credentials permit writing; otherwise switch to a pull request contribution flow through the user's fork. Use the managed service below for the shared catalog. Show the selected destination and whether the action publishes directly or proposes a pull request before submission.
- [ ] Build a managed contribution service for the shared RunRun catalog so users can submit translations and updates without a GitHub account, personal token, clone, or manual pull request. The extension should show the contribution and destination for confirmation, then the service validates the project and runs deterministic abuse checks. Publish normal contributions automatically as bot-authored commits without a PR; create a bot-authored PR for maintainer review when an abuse threshold is exceeded or the source IP is already flagged, leaving the catalog unchanged until approval. Normal contributions must not require Codex, an LLM call, or manual review; avoid token costs for legitimate routine updates. Keep direct publication to a user's own repository as a separate option.
- [ ] Use a GitHub App restricted to the shared catalog, with Contents and Pull requests write permissions. Keep its private key and installation tokens exclusively on the service, never in the extension. Handle updates and duplicate submissions without creating redundant commits or PRs. Commit passing contributions from unflagged source IPs directly; never automatically merge abuse-flagged PRs.
- [ ] Prefer Cloudflare Workers for managed hosting, with Turnstile, submission rate and size limits, and error notifications. Budget approximately USD 5/month before tax for hosting at modest usage (September 2026 estimate; verify pricing before deployment). The GitHub App and Turnstile are free; initial implementation and occasional application maintenance are separate from hosting. Avoid requiring routine server administration; maintainers review only abuse-flagged contribution PRs.
- [ ] Update publishing controls, tutorial, and setup documentation when the managed flow is implemented. Until then, retain the manual GitHub contribution fallback and describe its account requirements accurately. Do not treat unrelated network failures as missing write permissions.

### Managed contributions — identity, abuse prevention, and privacy

Merged from the Desktop discussion “Abusefilters voor bijdragen” on September 13, 2026. These tasks extend the managed contribution service above. The final choice supersedes the earlier display-name, name-filtering, and installation-ID proposals.

- [ ] Use only a server-generated public contributor identifier: a truncated HMAC-SHA256 of the normalized source IP with a server-only secret (prefer 12 hexadecimal characters). Do not collect display names, create accounts or per-user project versions, or use an unkeyed IP hash. Derive the source IP from trusted hosting/proxy information, never a client-supplied identity. Keep the secret stable for cross-submission correlation, protect it, and define key-version migration if compromised. Explain that the ID correlates network sources, not unique people: shared IPs share an ID and changing IPs change it.
- [ ] Keep Git commits bot-authored and attach `Contributor-ID` and a unique `Submission-ID` as metadata/trailers. Never publish raw IPs or service credentials. Store submission ID, contributor ID, timestamp, change/diff statistics, risk flags, and temporary raw IP in private service logs so moderation decisions and accepted vandalism can be traced.
- [ ] Submit the proposed project with video ID, language, and `baseRevision`; validate schema and destination server-side and calculate the diff against that revision. Detect concurrent updates before publication and return a conflict requiring rebasing instead of silently overwriting newer work; re-run validation and abuse checks against the updated base before committing. A revision conflict alone does not create a PR. Return clear published/pending-review/rejected/conflict status and retain local edits on failure.
- [ ] Use simple configurable thresholds for excessive changed/deleted lyric entries, emptied translations, major shortening, or widespread timing/structural changes. Calculate the diff server-side against the base revision; distinguish new translations from replacement of existing content. Determine the exact limits during implementation (the discussion's roughly 20% changed-entry threshold is only a starting example). Do not add profanity lists, semantic text analysis, or AI moderation. Include the exceeded thresholds and diff statistics in the review PR.
- [ ] When a threshold is exceeded, persist a review-required flag for that source IP and route both the triggering contribution and every subsequent valid contribution from the same IP to PRs, across all catalog files, even if later changes are small. Keep this state server-side under the full IP HMAC, independently of the truncated public ID and temporary raw-IP logs. Serialize flag checks/updates and publication per source so concurrent submissions cannot bypass the flag. Only explicit maintainer release restores automatic publication; merging one PR, reinstalling the extension, or deleting raw IP logs after 30 days must not clear it. Provide a maintainer action to inspect the reason and release the source; existing PRs remain subject to review. Shared-IP contributors necessarily share this status.
- [ ] Add maintainer-controlled IP bans, separate from review-required status. Check bans using the full normalized-IP HMAC before accepting contributions: banned sources cannot create commits or PRs. Provide ban/unban actions with reason, creation date, expiry, and an audit trail; preserve any underlying review-required flag when a ban ends. Make ban checks and publication concurrency-safe. Test rejection of banned sources, expiry/unban, and shared-IP behavior.
- [ ] Set the proposed default ban and private ban-record retention to at most 12 months from imposition, with earlier removal when no longer needed. Enforce bans with the full IP HMAC so ordinary raw-IP logs can still expire after 30 days. Retain a banned raw IP beyond 30 days only where necessary for a documented abuse investigation, with restricted access and a specific expiry no later than the ban's current 12-month period. Extend a ban/necessary records only after a documented maintainer assessment of new or continuing abuse, for at most another 12 months per assessment; blocked requests alone must not silently restart retention. Delete expired ban records and any exceptional raw-IP evidence, including through defined backup cleanup. Document this policy, contact/appeal route, and the distinction from ongoing review-required status in `privacy.md` before launch; validate necessity and retention against actual service use.
- [ ] Verify threshold boundaries, direct publication for ordinary unflagged changes, a triggering change becoming a PR, subsequent small changes from the flagged IP also becoming PRs, isolation between source IPs, persistence after raw-IP expiry, concurrent submissions, and explicit maintainer release restoring automatic publication. Normal submissions require no Codex or LLM calls.
- [ ] Define configurable rate and payload limits alongside Turnstile; evaluate the discussion's starting examples of 5 submissions/minute, 30/hour, 100/day per source IP and a 100 KB payload against actual projects and shared-network use. Return HTTP 429 for ordinary rate-limit excesses, rather than permanently banning the source. Route valid contributions that trigger a threshold or originate from an already flagged source IP to review PRs; reject invalid or oversized payloads and rate-limit excesses before creating commits or PRs to avoid repository spam. Handle duplicate/retried submissions without redundant commits or PRs.
- [ ] Automatically delete raw IPs from service logs within 30 days and account for hosting logs and backups when implementing retention. Retain an active HMAC-based review-required flag until explicit maintainer release; define cleanup after release and bounded retention for other private submission/abuse metadata separately from public Git history. Apply the documented ban/investigation retention rules above instead of retaining raw IPs indefinitely. Do not describe HMAC identifiers as anonymous or promise that deleting raw IP logs makes public contributions untraceable.
- [ ] Before enabling the service, update `privacy.md`, the extension's data-collection declaration, and the first-submission notice to explain temporary IP logging for abuse prevention, the 30-day limit, and the public, longer-lived pseudonymous contributor ID. Link the policy and offer Continue/Cancel before sending. Add `thomas@silverwoodslabs.com` for access, correction, or deletion requests concerning private personal data, with submission IDs/dates as optional lookup aids. Explain that accepted collaborative catalog content and repository history are retained and are not normally removed with a private-log deletion request, including the limits of control over forks/caches. Verify the applicable legal basis and rights wording before launch; avoid blanket exclusions of personal-data rights or presenting the notice as a settled consent basis.

### Planned privacy-policy text — managed contributions

- [ ] Review and adapt the draft below to the implemented service before adding it back to `privacy.md` and enabling submissions. Keep the published privacy policy limited to implemented functionality; retain future data-processing plans in this TODO until they apply.

Moved from `privacy.md` on September 14, 2026. This is draft text for an unimplemented service, not the current privacy policy.

#### Translation submissions

Contributions will temporarily log the source IP address for security and abuse prevention. Ordinary raw-IP logs will be deleted within 30 days. A server-generated pseudonymous contributor ID derived using HMAC-SHA256 may accompany public contributions and remain in repository history. It correlates network sources, not unique people, and is not anonymous data. No display name or account will be required.

Excessive changes or deletions will flag the network source for review. Further contributions from that source will require pull-request review until a maintainer explicitly releases it. This status will be stored using a private full-length IP HMAC and will survive deletion of the temporary raw-IP logs. Sources sharing an IP address will share the restriction.

##### IP bans and retention

Maintainers will also be able to ban a source IP from submitting contributions. Banned sources will not be able to create contributions or review pull requests through the service.

Bans and their private records (the full IP HMAC, reason, dates, and relevant moderation decisions) will be retained for up to 12 months from the ban being imposed, and removed sooner when no longer necessary. The HMAC will normally be sufficient to enforce the ban, so the raw IP will still be deleted within 30 days. Where a documented abuse investigation requires retaining the raw IP longer, access will be restricted and a specific expiry set within the current 12-month ban period.

New or continuing abuse may justify an extension of up to 12 months following a documented maintainer review. A blocked request will not automatically restart this period. Expired ban records and any raw IP retained for the investigation will be deleted, with cleanup also covering service logs and backups. Expiry or removal of a ban will not itself clear a separate review-required flag.

##### Privacy requests and ban appeals

For requests to access, correct, or delete private personal data, objections to its processing, or appeals against a ban or review restriction, contact [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com). Relevant submission IDs, contributor IDs, or approximate dates can help locate records. Requests will be assessed under applicable data-protection rights, including whether limited security records remain necessary; retention will not automatically override a valid deletion request.

Accepted contributions form part of the collaborative public catalog and its version history. A request to delete private logs will not normally remove accepted contribution content. Public copies may also exist in forks or caches outside our control. Deleting raw-IP logs does not make the remaining HMAC identifiers anonymous or guarantee that contributions can no longer be linked.

## Objective

Build a Firefox add-on that displays synchronized lyrics alongside YouTube videos. Show the original text above its corresponding translation. Fully support Japanese kanji and kana. Allow lyrics, translations, and timing to be edited independently.

## Reference performance

- Song: Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆ / Ahoy!! 我ら宝鐘海賊団☆.
- Special live performance: https://www.youtube.com/watch?v=h3chCOV_phw
- Initial English translation source: https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/
- The exact performance, available lyrics, and timing have not yet been verified. Do not assume studio timing matches this video.
- Use this performance to validate Japanese text, English translations, changes in live song structure, and video-specific timing.

## Shared architecture

- Only `src/bootstrap.js` loads automatically on YouTube: it mounts the Karaoke and Settings buttons. Load core, tutorial and editor scripts on the first Karaoke/Settings action (including shortcuts and the toolbar launcher); keep concurrent activation requests sharing one load and allow retry after failure. Do not build the editor, read projects or run the playback timer before activation.
- A content script manages the overlay and follows the YouTube player's playback position.
- A background component handles external source requests and local storage. Request only necessary extension permissions and access to source hosts in use.
- Keep Firefox's `data_collection_permissions` declaration aligned with outgoing data: LRCLIB search terms, website content used in search, translation and AI furigana generation, and the OpenAI authentication key. The current manifest declares these as required installation consent; opening Settings triggers the public catalog check; other network features remain user-triggered. Require Firefox 142 or newer so the minimum version supports built-in consent on both desktop and Android. Do not declare Android compatibility without verifying the Android interface and playback workflow.
- Separate rendering, player integration, source providers, translation mapping, and timing editing.
- Use the player's current playback position as the clock to avoid accumulated drift when pausing, seeking, or changing playback speed.
- Store customized performances by YouTube video ID. Keep retrieved source data separate from user corrections so refreshing a source does not overwrite edits.
- Each text block has a stable ID, start and end times in seconds, original text, translations keyed by language, and optional furigana segments. Repeated lines have separate blocks.
- Project schema 3 metadata includes `videoId`, its canonical `videoUrl`, the original unsanitized `videoTitle`, lyric title, artist, languages, one `source` object (provider and URL) or null, timing offset and furigana visibility. Derive URLs from video IDs; capture video titles from the matching watch page. Migrate older source arrays using only their last entry.
- Editing an individual line start shifts its end and all following rows by the same delta without confirmation. Preserve untimed values; initial timing has no previous delta. Validate the whole shift before applying it.
- Do not show a separate Delay in seconds field. Use Start at and Sync with video position for global timing; preserve stored project offsets and continue applying them internally.
- Line editor Start and End inputs use minutes:seconds with optional milliseconds (for example `3:32.250`), not raw seconds. Use the labels **Start** and **End** without a format suffix, and `0:32.250` as the placeholder for both fields and **Start at**. Blank fields remain untimed.
- Stored block times exclude the global offset. Overlay selection and Line editor display use video time (`block time + offset`); convert edited video times back to stored times. Apply the offset exactly once and test exact start/end boundaries.
- Version the storage and export schema and provide migrations when it changes.
- Support empty intervals for instrumental passages and additional blocks for live interludes.

### Lyrics sources and manual translations

- Find lyrics offers exact video matches from the built-in public catalog and always retains LRCLIB as an alternative. Open the section by default when the loaded project contains no lyric lines, and default it closed when lyrics already exist without overriding later user toggles. Use synchronized lyrics when available; do not assume complete catalog coverage.
- Search explicit artist aliases and extracted song titles; keep manual recording selection and query correction available.
- Track search edits per video: an untouched query follows that video's title, while a manually edited query is persisted under `lyricsSearch:<videoId>` and restored on reload or return. Reset in-memory search state on navigation and guard asynchronous restores against stale video results. Always show the current YouTube title in the editor header, without appending the video ID.
- Keep source retrieval separate from rendering and timing logic. Request only permissions for sources in use.
- Local project JSON file imports do not require a matching video. Load the imported lyrics, translations, furigana and timing for the current video, replacing videoId, videoUrl and videoTitle with the current video metadata. Keep replacement confirmation and stale-import protection. Repository catalog matching remains separate.
- Support LRC or project JSON file import under **Import / export** when sources are unavailable. Do not show a bulk lyrics paste field or describe pasting in the tutorial. Manual entry uses Add line before / Add line after per row in Line editor, with Add first line only when empty.
- Enter manual translations in each Line editor row, creating rows with Add line before / Add line after (Add first line when empty). Preserve original text, timing, and other translation languages.
- Save per-line translations locally as they are edited.
- Display source links. Treat retrieved content as untrusted text; never execute source HTML or scripts.

### Furigana (1.1.0)

- **AI translation → Generate furigana** uses the full original song as context with the existing saved key and model. Keep the key in the background; do not include it in project exports. No audio is sent or analyzed. Explain API billing and that contextual readings still need review.
- Keep local EDICT2/ENAMDICT generation as the option without an API key under **Display & timing**, with the button below the dictionary credits. Cache dictionaries in IndexedDB and retain Furikazan/EDRDG attribution.
- **Show furigana** controls ruby for both current and next original lyric lines. Generation enables it; toggling it alone must not trigger downloads or API requests.
- Store `furigana` as ordered `[text, readingOrNull]` segments and `furiganaEnabled` at project level in JSON schema 3 (introduced in schema 2). Validate exact text reconstruction and kana readings. Migrate schema 1 without modifying the input. Keep application version and project schema version separate.
- Render matching leading kana and okurigana outside ruby. Keep compound/name readings together when appropriate. Dictionary imperative handling must work for cached entries and avoid superseded rare readings.
- Put **Correct a term throughout this song** in its own section directly above **Line editor**. Per-line shortcuts open that section. Apply exact term corrections to every occurrence in the current project, merging split segments; leave cut fragments of longer words unannotated for review. Generate missing annotations locally before applying corrections. Do not imply these edits are global or persistent dictionary rules.
- Confirm replacement of existing furigana, including manual corrections. The dictionary button becomes **Re-generate furigana (dictionary)** when annotations exist. Show a spinner and disable the active button until completion or failure.
- Validate every result before applying any update. Reject stale results after navigation, project replacement, original-text edits or furigana edits. Preserve lyrics, translations and timing. Editing a lyric clears its annotations; repeating a line copies them.
- Test malformed, incomplete and refused AI responses, unknown/duplicate IDs, altered text, invalid/missing readings, saved-key routing, and JSON round trips. Mocked API tests do not establish pronunciation quality or live API compatibility.

## Version 1.x — Line-based karaoke

### Features

1. Detect the active YouTube video and derive an initial search from available title metadata. Allow manual artist and title corrections.
2. Search LRCLIB and let the user select a suitable recording. Rank title and explicit artist-alias matches; let the user choose because live and studio versions may differ.
3. Import LRC files and accept manually entered lyrics. Unsynchronized lyrics require timing edits before synchronized playback is possible.
4. Create lines and enter manual translations in Line editor. Display Japanese kanji/kana with English directly underneath, changing together as one block.
5. Provide a readable overlay showing the active line and optionally the next line, with visibility, text size, vertical placement, and fullscreen controls. Center both languages inside the YouTube player.
   - Toggle subtitles with a configurable shortcut, default `Alt+K`, or a microphone Karaoke button injected after `[data-yt-extension="transcript-copier"]` in `ytd-watch-metadata #owner`. Use the supplied microphone image as a 19×19 monochrome mask. Add an adjacent gear button that toggles the lyrics and timing settings open or closed. Opening Settings (gear, shortcut, toolbar, or preferences) automatically enables Karaoke; closing Settings never disables it. Keep the explicit Karaoke toggle available to turn it off. Fall back to the end of the owner row when Transcript tools are absent.
   - The extension toolbar icon and Firefox extension preferences open the same in-video Settings panel as the gear. Keep all preferences there; GitHub credentials use an isolated extension-origin frame styled like AI translation. Configure the activation shortcut through Firefox’s own extension shortcut manager. Do not add a separate preferences popup or an intermediate on/off menu.
   - Keep button and shortcut state synchronized. New tabs start with karaoke off; activation is per tab.
6. Provide an earlier/later timing offset saved per video.
   - **Start at** shows the earliest timed, non-empty lyric's video start in minutes:seconds. Editing it calculates the global offset from the stored start. If no lyric is timed, it sets the first non-empty line’s start. Show yellow warnings for untimed recording selections and remaining untimed lyrics.
   - Place **Sync with video position** beside the Start at field, separated by **or** and vertically aligned with the input. Sync anchors the selected timed line to the current video position, preserving milliseconds and relative timing. For an untimed selected line, set its start without shifting other lines.
   - Refresh Line editor's displayed start/end video times after offset changes. Synchronization does not enable karaoke automatically.
7. Build a timing editor with Start and End inputs in minutes:seconds. Do not show Mark line now or End previous line now buttons; the tutorial explains editing these time fields. Retain the existing timing keyboard shortcut. Allow subsequent start/end edits and inserting, deleting, repeating, and moving blocks. Do not trigger shortcuts while typing in text fields.
8. Allow lyrics and translation edits without re-entering timing.
9. Save projects and corrections locally. Support JSON export/import preserving both languages and timing. Retain LRC import; LRC alone is insufficient for a complete bilingual project.
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
- Export followed by import preserves both languages, block order, the current source, original video metadata, timestamps, furigana segments, and visibility. Schema 1 and 2 imports remain supported.
- Both furigana methods support review in Line editor and song-wide term correction. Verify spinner/disabled state, replacement cancellation, stale-result protection, and current/next-line ruby in Firefox.
- Manual translation through Line editor preserves original lyrics, timing, and other translation languages; JSON and LRC import/export remain available.
- Use focused tests for parsing, time selection, import validation, and storage. Manually verify rendering and player interaction in Firefox.

### Out of scope

- Audio analysis, automatic word timing, and word highlighting.
- Automatic translation through a mandatory custom backend.
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

- The current version is `1.3.2` (released September 15, 2026); `1.3.1` and `1.3.0` were released September 14, 2026; `1.2.0` and `1.1.1` were released September 12, 2026; `1.1.0` was released September 11, 2026; `1.0.0` was released on September 10, 2026. Treat every requested version bump as a release by default, dated on the day of the bump, unless the user explicitly specifies otherwise. Do not label it "Local build" or ask for separate release confirmation. Keep manifest, package metadata, package instructions, and release notes consistent. Private developer controls and the public interface share one application version; developer mode only changes visibility. Release status does not imply that the add-on has been signed or published to an external service. The user will commit when the add-on works sufficiently well; do not create commits unless explicitly asked. A release does not imply that all acceptance criteria have passed.

- Complete the outstanding line-based karaoke acceptance checks before implementing version 2.0.0 audio analysis.
- Verify source availability and the reference video during implementation. Do not claim successful synchronization without checking the actual performance.
- Use short original text in automated test fixtures; avoid unnecessarily bundling source lyrics with the extension.
- Keep changes small and verify each milestone against its acceptance criteria.

## Current editor controls

- Keep the Settings header compact in every view: 12px visible space above the header controls, with the same title and button positions before and after scrolling. The sticky header background must cover the panel’s top padding so scrolling text cannot appear above the title. Place Close beside the title and Tutorial, Surprise Me, Privacy Policy and About on the row below. Privacy Policy toggles an inline section in the Settings panel, loading the bundled `privacy.md`; keep that file included in the extension archive. Keep the inline privacy policy and the external `privacy.md` file in sync: `privacy.md` is the single source of truth, and the inline view must render that bundled file without duplicating or omitting policy text. After policy changes, rebuild the extension package and verify its bundled `privacy.md` matches the source file. Its title and right-aligned Close button share a fixed header above an independently scrolling policy body; keep both visible while reading. About toggles an inline section with ルンルンKARAOKE, the installed manifest version, © 2026 Thomas Kemperman, and thomas@silverwoodslabs.com linked using mailto with subject ルンルンKARAOKE. Use only About and Privacy Policy as the respective inline headings, without the brand suffix; keep the privacy heading in `privacy.md` consistent. About uses the same fixed title and right-aligned Close header with an independently scrolling body as Privacy Policy. Opening About or Privacy Policy closes the other section. Tutorial is text-only; retain assets/tutorial-video-reserve.svg. Show the selected-line highlight only during the tutorial.
- Each line has Add line before / Add line after, Jump to, reorder, Repeat and Delete. Show Add first line only when empty. Jump to seeks to the start plus offset without changing paused state. Delete confirms only for lines containing lyrics, translations, furigana or timing.
