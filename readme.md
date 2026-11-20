# ルンルンKARAOKE

<p align="center">
  <img src="assets/mascot.png" width="256" height="256" alt="A cheerful turquoise karaoke mascot singing with a musical-note speech balloon">
</p>

A Firefox add-on in development for synchronized lyrics on YouTube, with the original text above its translation. Designed to support Japanese kanji and kana, live performances, and editable timing for each video.

## Fix lyrics through MCP

The optional [local MCP integration](mcp/README.md) connects an agent to the running extension for audio-based lyric review. The [fix-lyrics skill](skills/fix-lyrics/SKILL.md) compares existing lyrics with the live recording (or generates missing lyrics), updates the target-language translation and Japanese furigana, and shows a timestamped old/new review table before applying. Publication and audio cleanup each require separate user permission. The skill source lives in this repository and can be linked into the personal Codex skill directory. No paid AI calls are made by the MCP server itself.

## Contact

Thomas Kemperman — [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com?subject=%E3%83%AB%E3%83%B3%E3%83%AB%E3%83%B3KARAOKE)

## License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 Thomas Kemperman.
Lyrics and translations obtained from external sources are not covered by this project's license.

## Project status

Version **1.5.0 was released on November 20, 2026**. This release adds optional local MCP integration and the fix-lyrics skill, improves synchronization and translation response mapping, supports kanji annotations above kana, and prevents overlapping captions. Schema 4 remains compatible with existing projects; schemas 1–3 remain importable. See [changelog.md](changelog.md) for validation and remaining acceptance coverage. The release package is unsigned and has not been published.

Implemented: a bilingual overlay, per-video local storage, manual timing and synchronization controls, LRC and JSON import/export, catalog, LRCLIB and Genius discovery, Surprise Me, optional AI translations, toggleable Japanese furigana with dictionary and AI generation, editable readings and song-wide term corrections, AudioShake recognition and line alignment, monthly API cost estimates, and configurable activation/display settings. No demo, real song lyrics, or verified timing are bundled.

## GitHub lyrics repositories

This developer-only section is hidden by default and excluded from the tutorial. To show it, run `localStorage.setItem("runrunKaraoke.developerMode", "true")` in the YouTube page console and reload. Set the same key to `"false"` and reload to hide it again. Hiding preserves all repository settings and the saved token.

Developer mode configures one public repository and branch for catalog loading, Surprise Me, search and publication. The default is `tkemperman/runrun-karaoke-lyrics-catalog`, branch `main`. In **Settings → Lyrics repositories · GitHub**, enter an `owner/repository` (or GitHub URL) and branch. Public reads need no token; publishing requires a fine-grained token restricted to that repository with **Contents: read and write**. Missing repository, missing or invalid token, permission failures and network errors have distinct messages. The token stays in background storage and is never returned to content scripts or included in published projects. The input is cleared when submitted; saved tokens are never returned to the interface. A placeholder indicates whether a token is saved. Repository fields and the token save automatically when changed (on leaving the field). **Clear token** immediately deletes the stored token.

Copy [lyrics-repository-template](lyrics-repository-template/README.md), including its `.github` directory, to the root of your lyrics repository. It provides the catalog format, validation script and GitHub Action. Initialize the branch and enable Actions with permission to write contents before uploading. The add-on does not create repositories or install workflows remotely.

In the lyrics editor, open **Lyrics repositories · GitHub**:

- **Publish to GitHub** reviews the repository, branch and file path inside Settings. **Confirm publication** publishes the current translation as `translations/SANITIZED_VIDEO_TITLE-VIDEO_ID/LANGUAGE.json`. Each file contains one translation language and the shared original lyrics, timing, furigana and display settings. Other remote languages remain intact. Changes to the project or reviewed branch invalidate publication; **Cancel** leaves the repository unchanged.
- **Open in GitHub**, between Publish and Delete, opens the published file for the current video and translation language in a new tab. It appears when a catalog match is known or immediately after publication.
- **Delete from GitHub**, the red button after Open in GitHub, finds the current video and selected translation language in the catalog. A confirmation dialog shows the repository, branch and file; deletion checks the reviewed file revision. Shared files containing other languages are not deleted by this action. The local project stays intact. The developer section starts expanded only when the active translation is known to be unpublished.

Repository folder titles come from the current YouTube video, independently of the lyric/translation title. Folder titles use lowercase Unicode letters and numbers (including Japanese), with whitespace and punctuation converted to single hyphens. Repeated hyphens collapse and leading/trailing hyphens are removed. Slugs are limited to 220 UTF-8 bytes; empty slugs use `untitled`. The YouTube ID keeps its original case. Matching and loading use the exact YouTube video ID, independently of the title or folder name. Existing ID-only catalog paths remain readable. Changing the YouTube video title changes its upload path.

The Action regenerates `index.json` after uploads. Reload the video after it finishes to refresh catalog availability; raw GitHub caching can delay visibility. The same configured repository serves public reads and explicit developer writes. Catalog checks can automatically load English only when there are no local changes. Authenticated inspection and publication use the saved token exclusively in the background. Publication uses the Git data API for one commit across language files; remote deletion uses the Contents API.

Version 1.5.0 validation: 204 JavaScript tests, 29 Python tests, syntax checks and Ruff security rules pass. Mozilla’s add-on linter reports zero errors, warnings and notices. All 20 tutorial steps were checked in Firefox, including navigation and highlighted targets; the audio cleanup button was checked with a present, absent and restored file. Details are recorded in [changelog.md](changelog.md). Paid generation and authenticated GitHub writes are separate from the release checks; mocked tests do not establish transcription or pronunciation quality.

## Feature scope

### Version 1.5.0

- Optional MCP project/audio access and a reviewed fix-lyrics workflow, with separate publication and cleanup approval.
- Exact synchronization without starting playback, a Start at reset cross, and refreshed timing after imports.
- Reverse ruby, overlapping-caption avoidance, short request-local translation IDs, and published-file GitHub links.
- Audio cleanup enabled only when the current cached file exists.
- Private, atomically replaced native-helper files and task receipts with symlink and ownership checks.
- Strict native JSON/request-ID validation and bounded AudioShake response processing.
- Line-based karaoke overlay with translations directly underneath.
- Lyrics lookup through LRCLIB with Genius fallback, recording selection and manual search corrections.
- Combined OpenAI translation/furigana and AudioShake lyric recognition or realignment of existing lyrics.
- Linux helper installation/status checks and monthly cost estimates with details by model.
- Automatic English catalog loading for unchanged projects, manual language selection and random discovery through **Surprise Me**, preserving local changes.
- One local translation per song, separate language files in the catalog, and local or developer-only remote deletion.
- Per-line lyrics and translation entry, project JSON import/export, and timed or untimed LRC import/export.
- A timing editor for live arrangements, repeated lines, and instrumental breaks.
- Per-video timing offsets and local project storage.
- JSON import/export preserving text, translations, the current source, YouTube metadata, timing, furigana readings, active language and separate original/translation display settings.
- Contextual AI furigana and local dictionary generation without an API key.
- Per-line readings and term corrections throughout the current song.
- Synchronization across pausing, seeking, playback speed changes, and fullscreen.

### Version 2.0.0 — Planned

- Further audio-analysis options beyond the current AudioShake line alignment.
- Word or Japanese text segment timing and highlighting where reliable.
- Review and correction of uncertain alignment results.
- Continued support for manual timing and existing projects.

Word/segment analysis and highlighting still require prototyping. AudioShake line timing is available now and has been checked on the test performance documented in the changelog; review results for each video.

## Lyrics and translation sources

The configured public catalog matches the exact YouTube video ID. Opening a video restores its local project and checks the catalog, even while Karaoke and Settings are closed. An available English translation is loaded and saved automatically only for empty or verifiably unchanged projects. Legacy local projects count as user work. If English is unavailable, no other language is loaded automatically. Surprise Me never replaces local edits.

**Find lyrics** offers a choice between **Use lyrics translation from catalog** and **Search for lyrics** when this video has catalog translations. The catalog load button sits below its radio option, above a horizontal “or” divider. Choosing search keeps the catalog controls visible but disabled and shows the search form. A single translation has a direct load button; multiple translations have a language selector with English selected when available. Without catalog matches, only the LRCLIB/Genius search form is shown. Titles and folder names do not determine video matching. Choose a catalog translation, enter one manually, import JSON, or translate with OpenAI.

Edit **Translation language code** in **Line editor** to set the translation language, for example `en`, `fr` or `nl`. The current text stays intact until you run **Translate all lines** and confirm replacement. Each song has one local translation. Publishing writes only its language file (`en.json`, `fr.json`, `nl.json`, etc.); other language files on GitHub remain available through the catalog. Line editor and AI share this language. A saved song retains its own language; new songs start with your last choice, initially `en`. **Lyrics language** describes the original text independently.

**Clear all lines**, the red button at the top of **Line editor**, removes all lyric lines and their translations, timing and furigana after confirmation. The button is hidden when no lines remain. It resets the timing offset and lyric source, preserves display and language settings, leaves GitHub untouched, and suppresses automatic loading for this video until lyrics are loaded manually. Export JSON first to keep a backup.

## Reference performance

The initial acceptance case is [Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆](https://www.youtube.com/watch?v=h3chCOV_phw), using Japanese lyrics with an [English translation](https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/) directly underneath.

The downloaded page identifies the video as “FuwaMoco x Senchou Sing - Ahoy!”, lasting 309 seconds. Its metadata lists Japanese automatic captions, but retrieving the track returned an empty response. Actual lyric timing still requires review during playback.

## Install for local use

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on…** and select this repository's `manifest.json`.
3. Open or reload a YouTube watch page.
4. Press **Alt+K**, or click the microphone **Karaoke** button after the Transcript tools beside the channel information. If the Transcript extension is absent, the button appears at the end of the same owner row.
5. Click the gear beside **Karaoke** to open **Settings**; click it again to close the panel. The extension toolbar icon and Firefox extension preferences open this same panel on your active or most recently used YouTube video. Display, timing, AI and GitHub preferences are all here. Configure the activation shortcut in Firefox’s **Manage Extension Shortcuts** menu.

On YouTube watch pages, the bootstrap mounts the Karaoke and Settings buttons and initializes the interface so local projects and catalog translations can load automatically. Karaoke stays off and Settings stays closed until opened, except when arriving through Surprise Me. Concurrent initialization requests share one load. The extension’s background component loads separately at extension startup.

Settings has a compact pinned header with **Tutorial**, the pink **Surprise Me** button, **Privacy Policy** and **About**. Surprise Me opens a random video from the translations catalog and is hidden when no different candidate is available. Privacy Policy and About open inline, with their headings and right-aligned **Close** buttons remaining visible while their contents scroll. About shows the application name, installed version, © 2026 Thomas Kemperman and the contact email with the application name as subject. Privacy Policy reads the bundled [privacy.md](privacy.md), which is also the external policy’s single source of truth.

New tabs start with karaoke off. Surprise Me keeps Karaoke and Settings open; manual navigation to another video or site turns Karaoke off and closes Settings. Activation is per tab; projects and display preferences are saved locally. A temporary add-on must be loaded again after restarting Firefox. The add-on uses Firefox Manifest V2, requires Firefox 142 or newer, and requires no build step.

Firefox's installation consent declares search terms, website content, and authentication information. Lyrics searches send the query (which can contain the video title) to LRCLIB. Automatic translation sends the original lyrics, block IDs, target language, and selected model to OpenAI, using your API key for authentication. Optional furigana is returned in the same translation request. Genius fallback sends the query and its own API token to Genius; AudioShake timing uploads the video audio and optional original transcript through the separately installed Linux helper. These requests occur when you use the corresponding feature; entering lyrics and translations manually remains available without them. GitHub catalog and project downloads contact raw.githubusercontent.com without a token; catalog filtering stays local. Surprise Me reads the translations catalog and asks YouTube whether shuffled candidate IDs are still available before opening one. Confirmed publishing sends the full project to api.github.com with your saved GitHub token. Projects, saved keys and the year of the latest 1-april Surprise Me result stay in extension-local storage except for these service requests and user-triggered exports. Opening a video checks the public catalog index and may download English for an unchanged project; video-ID matching happens locally. Dictionary generation downloads EDICT2 and ENAMDICT from EDRDG on first use, caches them locally, and does not send lyrics to EDRDG. Export project JSON before switching extension IDs or removing a development installation; the current ID is `runrun-karaoke@silverwoodslabs`, and data from a different extension ID is not automatically migrated.

## First playback test

1. Activate karaoke and open the lyrics editor.
2. Load an exact catalog match under **Find lyrics**, search LRCLIB, or load a lyrics file under **Import / export**.
3. Use **Line editor → Add first line**, or **Add line before / Add line after** on an existing line, to create lines, then enter each English passage under its matching original line in **Line editor**. If timing needs adjustment, edit each line’s **Start** and **End** fields; **Alt+Shift+M** marks successive lines while the editor is open and focus is outside text fields.
4. Play the video and check pause, backward/forward seeking, playback speed, fullscreen, and Alt+K. The microphone button should reflect the same on/off state.
5. Generate furigana through **AI features** with an API key, or through the dictionary button in **Display & timing** without one. Check current/next-line ruby and toggle **Show furigana**.
6. Correct a reading in **Line editor**, then try **Correct a term throughout this song** for a repeated term.
7. Export a JSON backup, reload the page, and import the backup. Check timing, translations, readings, and furigana visibility.

The overlay is centered inside `#movie_player`, above its controls. Its default bottom offset is 13% of player height; adjust it in Settings to avoid existing subtitles. The downloaded HTML confirms the player root ID but does not contain the rendered video element. Placement still needs visual testing in normal, theater, and fullscreen modes.

## Lyrics search and artist aliases

The search field accepts a YouTube title or a manually corrected song/artist query. Search derives a likely song title from a spaced dash separator, removes familiar video annotations, and detects artists using the explicit alias groups in `src/search.js`.

Until you edit it, the search field follows the current video's title. A manually edited query is saved for that video and restored after a page reload or return visit. Opening another video uses that video's saved query, or its title if no query was saved. The editor header always shows the current YouTube video title.

For example, `FuwaMoco x Senchou Sing - Ahoy!` produces searches including `Ahoy! 宝鐘マリン`, `Ahoy! Houshou Marine`, and `Ahoy! FUWAMOCO`. Each recognized artist is searched separately because a cover performer may differ from the artist listed in LRCLIB. The initial groups cover Marine (including Houshou Marin and Senchou) and FUWAMOCO.

Search tries up to eight distinct artist/title combinations, with at most two requests in flight. If these return no recordings, it tries the original query and the extracted title. Results are merged by LRCLIB ID, ranked by artist-alias and title overlap, and limited to 40 recordings. Successful results survive failures in other requests; failures are reported when no results are available. Choose the recording manually; a match does not imply that studio timing fits a live performance.

To extend the aliases, add spellings to an artist's array in `src/search.js`, placing the preferred catalog spelling first, or add a new artist group. Matching normalizes Unicode, letter case, punctuation, and whitespace, and requires whole normalized words. Aliases are curated in code, not learned automatically. Selected recording metadata continues to be saved with the video project.

Automatic translation and general romaji-to-Japanese conversion are intentionally excluded from search. A Japanese spelling is searched only when explicitly present in an alias group. Unknown names and titles can be corrected manually in the search field. Manual lyric translations remain supported.

## Display and timing

The gear or **Alt+L** toggles the editor open or closed. The Close button also closes it. **Display & timing** controls the timing delay (positive means later), separate visibility, text size and vertical placement for original lyrics and translation, **Show next line**, and **Show furigana**. These display choices are saved in the project, JSON exports and GitHub files. The checkbox and its clickable label share one row. Toggle karaoke with the microphone button or Alt+K; there is no duplicate on/off button in the editor.

When captions would overlap, the upper caption moves upward just enough to keep an 8px gap. This adapts to wrapped text, ruby, the next-line preview and player resizing without changing your saved position settings. Captions return to their preferred positions when the extra space is no longer needed.

Loading lyrics from LRCLIB or GitHub immediately updates **Start at** to the first timed lyric. LRCLIB clears the previous offset; GitHub restores the saved timing and offset, including when the lyric text matches the current project. Manual GitHub loads ask before importing timing, furigana and display settings into a matching project. Untimed lyrics leave **Start at** blank.

Use **Start at** to set when the first lyric should appear, in `minutes:seconds` with optional milliseconds (for example, `0:32.250`). With untimed lyrics, this sets the first non-empty line’s start. Alternatively, select a line in **Line editor** and click **Sync with video position** as it begins. Sync sets an untimed line’s start or adjusts the global delay for an already timed line, preserving relative timing and milliseconds. A yellow warning appears when selecting untimed lyrics and remains above the editor while any lyric lines still need timing. Set each remaining line’s Start time; setting the first start does not automatically time the rest of the song.

**Start** and **End** in Line editor show video times including the delay and update when it changes. Editing these values converts them back to stored timestamps automatically. For example, a first lyric at `15.27` seconds with **Start at** set to `0:32` produces a delay of `16.73` seconds and an editor start of `0:32`. Start and End use the placeholder `0:32.250`; Start at has no placeholder. Fractions with one to three decimal places are supported; a blank End lasts until the next timed line. There is no separate delay input. Opening Settings automatically enables Karaoke; closing Settings leaves it enabled. Use **Karaoke** or **Alt+K** to turn it off.

Changing a line’s start in Line editor shifts that line’s end and all following lines by the same amount after confirmation. Existing durations and gaps are preserved. Setting an untimed line’s first start only times that line. Global shifts affecting other timed lines also ask for confirmation. The cross inside **Start at** sets the first lyric to **0:00** and shifts all timed lyrics by the same amount, preserving their relative timing.

## Applying translations

Use **Line editor → Add first line**, or **Add line before / Add line after** on an existing line, to create a line, then enter its original lyrics and translation. Existing lyrics can be translated directly in each row. Lyrics and translations share timing and edits save automatically.

Under **Import / export**, JSON backs up the current translation and its language, original-language metadata, timing, furigana and display settings. JSON file import targets the current video without video matching. Compatible original lyrics allow replacing the current translation, with overwrite confirmation; different original lyrics require complete replacement confirmation. Older multilingual JSON files load their selected translation. JSON restores its own offset. Import LRC with or without timestamps; LRC and search replacement reset the offset. **Export timed LRC** includes original lyrics and video timing (including the delay); every line needs a start time. **Export untimed LRC** saves original lyrics without timestamps. LRC does not preserve translations, furigana, or project metadata.

## AI features

Open **AI features**, enter your OpenAI API key, select a model (GPT-6 Astra by default, GPT-5.6 Sol/Terra/Luna, GPT-5.5, GPT-5, GPT-4.1, GPT-4o, or GPT-4o mini), and choose a translation language code, shared with Line editor (initially `en`, then your last choice). Your key, provider, model, and language preferences persist in the extension’s local storage. The key is not included in project JSON exports; use **Remove key** to delete it.

**Translate all lines** sends all original lines together to OpenAI for context. API usage is billed to your OpenAI account. Strict JSON output pairs each translation with its original block ID. Invalid, incomplete, or stale results leave existing translations unchanged. Replacing existing translations requires confirmation. Review the translations in Line editor; timings are preserved. Lines already in the target language receive an empty translation. AI detects the original language. **Convert Japanese romaji to kanji/kana** is a saved, default-on checkbox; it applies only to Japanese romaji, not other languages.

While the request is running, the button shows a spinner and **Translating…** and is disabled to prevent duplicate requests. It becomes available again when the operation finishes or fails.

The default model option uses the API model ID `gpt-6-astra`; model choices are configured in the source.

Model choices were checked against the [OpenAI model catalog](https://developers.openai.com/api/docs/models) on September 9, 2026. Availability for your API key depends on your account and model access.

## Project JSON

Project JSON includes `videoUrl` (`https://www.youtube.com/watch?v=VIDEO_ID`), derived from the matching `videoId`. Older imports receive it automatically; schema 4 reads projects from schemas 1–3.

`videoTitle` preserves the original YouTube video title, including case, punctuation and Japanese characters. It is separate from the lyric `title`; only the folder name is sanitized. Older projects without this field receive the video title when opened on YouTube.

Schema 4 stores the original language, the current translation and its language, display settings and one `source` object with `provider` and `url`, or `null`. Older arrays migrate using the last source. Selecting another recording replaces the source. Export/import preserves lyrics, translations, timing and furigana.

## Japanese furigana

In the video's **Display & timing** panel, select **Generate furigana (dictionary)**. First use downloads EDICT2 and ENAMDICT from EDRDG and stores them in the extension's local IndexedDB. Generation then runs locally without sending lyrics to a service. **Show furigana** switches readings on or off for both the current and next original lyric line. Generation enables visibility; the switch itself never downloads anything.

Correct generated or imported readings under **Line editor → Edit furigana readings**. Readings cover the complete displayed dictionary word, including its kana; matching leading kana and okurigana are kept outside the ruby when displayed. Dictionary matching cannot guarantee the intended pronunciation of ambiguous words, names or creative sung readings. Unknown text stays unchanged. Editing original lyrics clears that line's annotations. Generation can restore them; regeneration replaces existing readings after confirmation. Repeating a line copies its readings.

Manual annotations can also place kanji above kana lyrics, for example `ドーマン` with `道満` above it. This uses the same ruby display and is preserved in project JSON. Automatic furigana generation still produces kana readings; regeneration replaces manual annotations after confirmation.

Project JSON schema 4 stores a single `source` object (`provider` and `url`), or `null` when absent. Schema 1 and 2 imports retain only the last entry from their `sources` array. It preserves furigana segments and visibility, together with lyrics, translations and timing. Imported readings work without downloading dictionaries. Schema 1 projects migrate automatically with furigana off. LRC contains no furigana; use project JSON for full backups. Invalid annotations are rejected before replacing existing work.

The dictionary implementation is adapted from Furikazan (MIT, Copyright 2026 SilverwoodsLabs). EDICT2 and ENAMDICT are provided by the Electronic Dictionary Research and Development Group; see [dictionary licence and attribution](https://www.edrdg.org/edrdg/licence.html). The extension downloads dictionary data separately and does not bundle it.

Use **Correct a term throughout this song**, directly above **Line editor**, to apply an exact term and kana reading to every occurrence in the current project's original lyrics, for example `宝鐘 → ほうしょう`. This also merges terms split across dictionary segments. Line editor provides shortcuts to fill in an existing reading or enter a combined term. Corrections replace existing readings for that term and are saved in JSON exports. Other complete annotations remain unchanged; fragments cut from larger annotated words become unannotated rather than receiving guessed readings. Matching lines without furigana are generated first (requiring the dictionaries). Changes during generation discard the pending result. This is a project-wide edit, not a global dictionary rule: newly added or rewritten lines need the correction applied again.

The furigana dictionary button becomes **Re-generate furigana (dictionary)** when annotations exist. This regenerates all Japanese lines after confirmation, including manual corrections. Errors leave existing annotations intact.

**AI features → Generate furigana** is a saved checkbox, selected by default. **Translate all lines** returns translations and optional contextual Japanese readings in one OpenAI request. Existing readings are preserved when the checkbox is clear. When selected, replacement of translations and readings is confirmed together. The response format requires readings for kanji segments. Missing readings identify the affected lines and leave the project unchanged; retry manually or turn off Generate furigana to translate without readings. Invalid, incomplete or stale results preserve existing work. No audio is sent to OpenAI; dictionary generation remains available independently.

## Known limitations

- Full reference-performance timing validation remains outstanding; AudioShake recognition and line alignment are available, while word highlighting remains planned.
- Neither dictionary nor contextual AI readings guarantee the sung pronunciation. Review ambiguous words and names by ear. The optional fix-lyrics skill supports agent-led review against audio; the extension does not automatically derive sung readings from AudioShake. Built-in audio-based furigana generation remains a separate investigation.
- AI furigana has automated mocked-response coverage and user-confirmed live API generation; comprehensive Firefox visual/playback testing remains outstanding.
- Splitting/merging passages uses manual editing and adding/removing lines; dedicated split/merge controls are still planned.
- The last LRC line has an open end unless an end time is supplied; set its end in the editor to hide it after the final vocals.
- Current player integration targets desktop YouTube watch pages, not Shorts or embedded players.

## Development

See [agents.md](agents.md) for the architecture, implementation sequence, and acceptance criteria. See [changelog.md](changelog.md) for release status and planned version scope.

Use English for code comments, identifiers, documentation, commit messages, and default interface text. Lyrics, translations, artist names, and song titles retain their original languages.

Run `npm test` for the JavaScript tests, including search, translation/furigana, timing, usage costs, native messaging and GitHub publication confirmation. Run `npm run test:native` for the Python helper tests and `npm run check` for JavaScript/Python syntax and shell checks. No npm dependencies are required. The JavaScript test command uses Node.js 22 or newer.

Run `npm run package` to create `dist/runrun-karaoke-1.5.0.zip`, an unsigned extension package. Packaging uses Python 3 and includes the manifest, runtime assets, LICENSE and privacy.md. The private developer controls and public interface use the same versioned runtime; developer mode only changes visibility. The packaging command does not sign or publish the add-on.

Run `npm run package:local` to create `dist/runrun-karaoke-1.5.0-local.zip` for temporary Firefox testing. Its display version is `1.5.0-local` and its internal Firefox version is `1.5.0.1`, keeping it distinguishable from the public 1.5.0 package without changing source version metadata.

### Guided tutorial

On the first visit to Settings, the tutorial starts once the video project is ready, if no previous tutorial visit has been saved. The purple **Tutorial** button in Settings reopens it at your saved step. Use **Previous**, **Next**, the left/right arrow keys, or the chapter menu to navigate. **×** or **Escape** closes the tutorial. Arrow keys keep their normal behavior inside input fields and the chapter menu. Progress is stored locally, separately from song projects.

The 20 compact steps cover catalog choices, language selection, Surprise Me, lyrics search, furigana, editing, timing and playback, plus optional AI and file workflows. Correct readings automatically expands Edit furigana readings. Optional chapters cover AI translation, audio recognition and timing, costs, recurring term corrections, live arrangements, JSON/LRC backups and imports. Developer repository setup and publication are excluded. Controls remain usable during the guide; advancing a step does not run any action. On narrow screens the guide appears below Settings.

**Find lyrics** offers mutually exclusive catalog and search options when exact-video catalog translations exist, and only search otherwise. English can load automatically when there are no local changes; manual loading confirms overwrites. The section opens by default when there are no saved lyric lines. Search remains available even when a catalog translation is already loaded or the catalog is unavailable.

The header places **Close** beside the title, with **Tutorial**, **Surprise Me**, **Privacy Policy** and **About** below. Surprise Me chooses a different catalog video, checks each unique shuffled candidate at most once, skips removed videos and silently hides when no candidate is available. On April 1, its first click per year opens a fixed surprise before normal selection resumes; only the year is stored. About contains the contact email link with subject ルンルンKARAOKE. Tutorial has no icon; the previous video icon is retained as a reserve asset. Tutorial highlighting disappears when the guide closes.

Each line offers **Add line before**, **Add line after**, **Jump to**, reorder arrows, **Repeat** and **Delete**. Jump to seeks the video to the line’s start including its offset, preserving paused playback. Empty projects offer **Add first line**. Delete asks for confirmation only if the line contains text, translations, furigana or timing.

## Genius fallback and AI timing

Search uses LRCLIB first; untimed text counts as a usable result. Only when none is usable does it search Genius with your saved Genius API token. Choose a recording manually. Results and loaded projects retain the provider and source URL. Empty searches, connection errors, and Genius blocks are reported separately. Search never starts paid AI processing.

AI features combines translation and optional contextual furigana in one OpenAI call. Generate furigana is selected by default and saved as a preference. Clear it to preserve existing readings. The complete response is validated before application; replacement of translations/readings is confirmed together. Requests use short line numbers to keep repeated lyrics correctly linked to their saved IDs. Unknown or duplicate IDs and invalid translations are reported separately, without applying a partial result. Dictionary generation remains independent.

For AudioShake, install the [Linux helper](native/README.md) from Settings, choose Check again, save a separate AudioShake key and select a language (Auto by default). Generate timed lyrics uploads complete audio and automatically includes existing lyrics for alignment. When there are no existing lyrics, AudioShake transcribes and aligns the actual recording, useful for live versions and shortened intros. Apply the recognized lyrics, then use OpenAI translation to add translations and optional furigana while retaining their timing. Videos must be complete, finite and at most 45 minutes. Paid API usage applies only on explicit generation.

The helper reuses validated temporary audio for the same video when available, avoiding another download and conversion after lyric edits. It still uploads the audio and current lyrics for each new paid timing task. **Clear audio file** is enabled only when a cached file exists and no timing/cleanup operation is active. It immediately deletes the current video’s cached audio; the next timing request downloads it again. This leaves lyrics, timing and saved task results intact. Progress covers download or reuse, conversion, upload and server processing. Cancel stops local work; remote tasks may continue. Resume follows the same task ID, including after a Firefox restart. An uncertain submission is never automatically repeated. Preview and Apply/Discard are separate. With existing lyrics, text, IDs, translations and readings are preserved; ambiguous or unmatched lines remain untimed. Recognition creates new lines and asks before replacing project content. Application resets the global offset to zero and rejects stale projects or invalid timing. Review by listening and use Line editor for corrections. This version applies line timing only.

Native helper packaging is generated by `npm run package`; the archive includes a downloadable `native-helper.zip`. Run `npm test`, `npm run test:native` and `npm run check`. API fixtures verify contracts and preservation, but live provider compatibility and sung timing still require an actual video test.

**Generate timed lyrics** automatically runs alignment when the project contains lyrics for the current live performance or cover, even when those lyrics are already timed. It preserves text, line IDs, translations and furigana and uses the same preview, stale-result protection and Apply/Discard controls. It is a new paid alignment request, not a global offset shift.

## Monthly AI costs

AI features shows the current month’s recorded estimated total in USD. **Details** selects a month and groups requests by provider/model with input, cached-input and output tokens or AudioShake credits. OpenAI estimates use each response’s actual model and service tier, with public rates checked on November 12, 2026; the calculated amount and rates are saved per response. Selecting another model never reprices previous calls. Unknown models, tiers or usage remain unpriced.

Set your actual AudioShake USD price per API credit in Details (amount paid divided by credits purchased). It prices new tasks and previously unpriced recorded credits; already-priced tasks keep their amount. Each task ID is counted once even when resumed. Cancellation does not imply a refund; an unfinished task stays unpriced until billing data is received.

This is a local record of usage observed by the extension, not an account-wide bill. Earlier use, requests with no response, taxes and usage from other applications are not included. Usage is recorded before lyric-result validation, since a rejected result can still be billable. The ledger and price preferences are excluded from project exports. See [OpenAI API pricing](https://developers.openai.com/api/docs/pricing) and the [AudioShake dashboard](https://dashboard.audioshake.ai) for provider billing.
