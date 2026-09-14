# ルンルンKARAOKE

<p align="center">
  <img src="assets/mascot.png" width="256" height="256" alt="A cheerful turquoise karaoke mascot singing with a musical-note speech balloon">
</p>

A Firefox add-on in development for synchronized lyrics on YouTube, with the original text above its translation. Designed to support Japanese kanji and kana, live performances, and editable timing for each video.

## Contact

Thomas Kemperman — [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com?subject=%E3%83%AB%E3%83%B3%E3%83%AB%E3%83%B3KARAOKE)

## License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 Thomas Kemperman.
Lyrics and translations obtained from external sources are not covered by this project's license.

## Project status

Version **1.3.0 was released on September 14, 2026**, simplifying lyrics discovery, timing, line editing and the tutorial. See [changelog.md](changelog.md) for the release history. The release package is unsigned; full Firefox acceptance testing remains outstanding.

Implemented: a bilingual overlay, per-video local storage, manual timing and synchronization controls, LRC and JSON import/export, LRCLIB search, optional AI translations, toggleable Japanese furigana with dictionary and AI generation, editable readings and song-wide term corrections, and configurable activation/display settings. No demo, real song lyrics, or verified timing are bundled.

## GitHub lyrics repositories

This developer-only section is hidden by default and excluded from the tutorial. To show it, run `localStorage.setItem("runrunKaraoke.developerMode", "true")` in the YouTube page console and reload. Set the same key to `"false"` and reload to hide it again. Hiding preserves all repository settings and the saved token.

Developer mode supports separate public retrieval and authenticated upload repositories. In extension **Settings → Lyrics repositories · GitHub**, enter each `owner/repository` (or GitHub URL) and branch. Save a fine-grained GitHub token restricted to the upload repository with **Contents: read and write**. The token is stored locally, kept inside an isolated extension frame, and never included in published projects. The input is cleared when submitted; saved tokens are never returned to the interface. A placeholder indicates whether a token is saved. Repository fields and the token save automatically when changed (on leaving the field). **Clear token** immediately deletes the stored token.

Copy [lyrics-repository-template](lyrics-repository-template/README.md), including its `.github` directory, to the root of your lyrics repository. It provides the catalog format, validation script and GitHub Action. Initialize the branch and enable Actions with permission to write contents before uploading. The add-on does not create repositories or install workflows remotely.

In the lyrics editor, open **Lyrics repositories · GitHub**:

- **Search repository** downloads the public catalog without credentials. With an empty filter, results match the current video ID; enter a title, artist or video ID to search the complete catalog locally.
- **Load selected project** validates the downloaded project and confirms replacement. Other-video projects must be opened on their corresponding YouTube video. Edits made while downloading are preserved.
- **Publish project to GitHub** shows the repository, branch and filename for confirmation. It publishes the complete project as `translations/SANITIZED_VIDEO_TITLE-VIDEO_ID/LANGUAGE.json`, including all translations, timing and furigana. Existing files are updated using their reviewed revision; concurrent changes fail without silently overwriting them.

Repository folder titles come from the current YouTube video, independently of the lyric/translation title. Folder titles use lowercase Unicode letters and numbers (including Japanese), with whitespace and punctuation converted to single hyphens. Repeated hyphens collapse and leading/trailing hyphens are removed. Slugs are limited to 220 UTF-8 bytes; empty slugs use `untitled`. The YouTube ID keeps its original case. Matching and loading use the exact YouTube video ID, independently of the title or folder name. Existing ID-only catalog paths remain readable. Changing the YouTube video title changes its upload path.

The Action regenerates `index.json` after uploads. Search again after it finishes; raw GitHub caching can delay visibility. This version supports one retrieval source and one upload destination, with user-triggered developer actions. Separately, opening Settings checks the built-in public catalog. The current testing switch DISABLE_GITHUB_TOKEN in src/background.js disables authenticated publication without deleting the saved token. The API integration follows [GitHub's repository contents API](https://docs.github.com/en/rest/repos/contents?apiVersion=2026-03-10).

Validation for the current release is recorded in the changelog. Existing GitHub catalog projects have been migrated and their index validated locally. Full Firefox interaction, extension-driven authenticated publication and hosted Action verification remain outstanding.

## Feature scope

### Version 1.3.0

- Line-based karaoke overlay with translations directly underneath.
- Lyrics lookup through LRCLIB, with recording selection and manual search corrections.
- Per-line lyrics and translation entry, project JSON import/export, and timed or untimed LRC import/export.
- A timing editor for live arrangements, repeated lines, and instrumental breaks.
- Per-video timing offsets and local project storage.
- JSON import/export preserving text, translations, the current source, YouTube metadata, timing, furigana readings, and visibility.
- Contextual AI furigana and local dictionary generation without an API key.
- Per-line readings and term corrections throughout the current song.
- Synchronization across pausing, seeking, playback speed changes, and fullscreen.

### Version 2.0.0 — Planned

- Audio analysis to align lyrics with the actual performance.
- Word or Japanese text segment timing and highlighting where reliable.
- Review and correction of uncertain alignment results.
- Continued support for manual timing and existing projects.

Audio input, processing architecture, and model choice will be determined through a prototype. Automatic timing quality is not yet established.

## Lyrics and translation sources

Lyrics can be loaded from an exact video match in the public karaoke catalog or searched through LRCLIB. Opening Settings downloads `index.json` and matches its `videoId` entries locally against the current YouTube ID. Each match supplies the project file path; the extension does not scan the `translations/` folders. Renaming a video does not affect lookup. The chosen project is downloaded only when loaded, and its `videoId` is checked again. Translations can be entered manually, imported in a project JSON file, or generated with OpenAI.

Enter translations under each original line in Line editor. Review and correct the passages manually in Line editor. Studio timing may need substantial adjustment for live performances.

## Reference performance

The initial acceptance case is [Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆](https://www.youtube.com/watch?v=h3chCOV_phw), using Japanese lyrics with an [English translation](https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/) directly underneath.

The downloaded page identifies the video as “FuwaMoco x Senchou Sing - Ahoy!”, lasting 309 seconds. Its metadata lists Japanese automatic captions, but retrieving the track returned an empty response. Actual lyric timing still requires review during playback.

## Install for local use

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on…** and select this repository's `manifest.json`.
3. Open or reload a YouTube watch page.
4. Press **Alt+K**, or click the microphone **Karaoke** button after the Transcript tools beside the channel information. If the Transcript extension is absent, the button appears at the end of the same owner row.
5. Click the gear beside **Karaoke** to open **Settings**; click it again to close the panel. The extension toolbar icon and Firefox extension preferences open this same panel on your active or most recently used YouTube video. Display, timing, AI and GitHub preferences are all here. Configure the activation shortcut in Firefox’s **Manage Extension Shortcuts** menu.

On `https://www.youtube.com/*`, only the lightweight Karaoke and Settings buttons load initially. The interface scripts, project reads and playback polling start on the first Karaoke or Settings action, including shortcuts and the toolbar launcher. Once activated, the interface remains loaded for that page even after closing Settings or disabling Karaoke. The extension’s background component loads separately at extension startup.

Settings has a compact pinned header with **Tutorial**, **Privacy Policy** and **About**. Privacy Policy and About open inline, with their headings and right-aligned **Close** buttons remaining visible while their contents scroll. About shows the application name, installed version, © 2026 Thomas Kemperman and the contact email with the application name as subject. Privacy Policy reads the bundled [privacy.md](privacy.md), which is also the external policy’s single source of truth.

New tabs start with karaoke off. Activation is per tab; projects and display preferences are saved locally. A temporary add-on must be loaded again after restarting Firefox. The add-on uses Firefox Manifest V2, requires Firefox 142 or newer, and requires no build step.

Firefox's installation consent declares search terms, website content, and authentication information. Lyrics searches send the query (which can contain the video title) to LRCLIB. Automatic translation sends the original lyrics, block IDs, target language, and selected model to OpenAI, using your API key for authentication. AI furigana generation sends the complete original lyrics, block IDs and selected model to OpenAI using the same saved key. These requests occur when you use the corresponding feature; entering lyrics and translations manually remains available without them. GitHub catalog and project downloads contact raw.githubusercontent.com without a token; catalog filtering stays local. Confirmed publishing sends the full project to api.github.com with your saved GitHub token. Projects and saved keys stay in extension-local storage except for these service requests and user-triggered exports. Opening Settings automatically downloads the public catalog index; video-ID matching happens locally. Dictionary generation downloads EDICT2 and ENAMDICT from EDRDG on first use, caches them locally, and does not send lyrics to EDRDG. Export project JSON before switching extension IDs or removing a development installation; the current ID is `runrun-karaoke@silverwoodslabs`, and data from a different extension ID is not automatically migrated.

## First playback test

1. Activate karaoke and open the lyrics editor.
2. Load an exact catalog match under **Find lyrics**, search LRCLIB, or load a lyrics file under **Import / export**.
3. Use **Line editor → Add first line**, or **Add line before / Add line after** on an existing line, to create lines, then enter each English passage under its matching original line in **Line editor**. If timing needs adjustment, edit each line’s **Start** and **End** fields; **Alt+Shift+M** marks successive lines while the editor is open and focus is outside text fields.
4. Play the video and check pause, backward/forward seeking, playback speed, fullscreen, and Alt+K. The microphone button should reflect the same on/off state.
5. Generate furigana through **AI translation** with an API key, or through the dictionary button in **Display & timing** without one. Check current/next-line ruby and toggle **Show furigana**.
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

The gear or **Alt+L** toggles the editor open or closed. The Close button also closes it. **Display & timing** controls the timing delay (positive means later), text size, distance above the video bottom, **Show next line**, and **Show furigana**. The checkbox and its clickable label share one row. Toggle karaoke with the microphone button or Alt+K; there is no duplicate on/off button in the editor.

Use **Start at** to set when the first lyric should appear, in `minutes:seconds` with optional milliseconds (for example, `0:32.250`). With untimed lyrics, this sets the first non-empty line’s start. Alternatively, select a line in **Line editor** and click **Sync with video position** as it begins. Sync sets an untimed line’s start or adjusts the global delay for an already timed line, preserving relative timing and milliseconds. A yellow warning appears when selecting untimed lyrics and remains above the editor while any lyric lines still need timing. Set each remaining line’s Start time; setting the first start does not automatically time the rest of the song.

**Start** and **End** in Line editor show video times including the delay and update when it changes. Editing these values converts them back to stored timestamps automatically. For example, a first lyric at `15.27` seconds with **Start at** set to `0:32` produces a delay of `16.73` seconds and an editor start of `0:32`. Start at, Start and End use the placeholder `0:32.250`. Fractions with one to three decimal places are supported; a blank End lasts until the next timed line. There is no separate delay input. Opening Settings automatically enables Karaoke; closing Settings leaves it enabled. Use **Karaoke** or **Alt+K** to turn it off.

Changing a line’s start in Line editor shifts that line’s end and all following lines by the same amount, without confirmation. Existing durations and gaps are preserved. Setting an untimed line’s first start only times that line.

## Applying translations

Use **Line editor → Add first line**, or **Add line before / Add line after** on an existing line, to create a line, then enter its original lyrics and translation. Existing lyrics can be translated directly in each row. Lyrics and translations share timing and edits save automatically.

Under **Import / export**, import or export project JSON for a complete backup including translations and furigana. JSON file import loads the lyrics, translations, furigana and timing for the current video without video matching. Import LRC with or without timestamps. **Export timed LRC** includes original lyrics and video timing (including the delay); every line needs a start time. **Export untimed LRC** saves original lyrics without timestamps. LRC does not preserve translations, furigana, or project metadata.

## AI translation

Open **AI translation**, enter your OpenAI API key, select a model (GPT-6 Astra by default, GPT-5.6 Sol/Terra/Luna, GPT-5.5, GPT-5, GPT-4.1, GPT-4o, or GPT-4o mini), and choose a translation language code. Your key, provider, model, and language preferences persist in the extension’s local storage. The key is not included in project JSON exports; use **Remove saved API key** to delete it.

**Translate all lines** sends all original lines together to OpenAI for context. API usage is billed to your OpenAI account. Strict JSON output pairs each translation with its original block ID. Invalid, incomplete, or stale results leave existing translations unchanged. Replacing existing translations requires confirmation. Review the translations in Line editor; timings and other language translations are preserved.

While the request is running, the button shows a spinner and **Translating…** and is disabled to prevent duplicate requests. It becomes available again when the operation finishes or fails.

The default model option uses the API model ID `gpt-6-astra`; model choices are configured in the source.

Model choices were checked against the [OpenAI model catalog](https://developers.openai.com/api/docs/models) on September 9, 2026. Availability for your API key depends on your account and model access.

## Project JSON

Project JSON includes `videoUrl` (`https://www.youtube.com/watch?v=VIDEO_ID`), derived from the matching `videoId`. Older imports receive it automatically; schema 3 remains compatible.

`videoTitle` preserves the original YouTube video title, including case, punctuation and Japanese characters. It is separate from the lyric `title`; only the folder name is sanitized. Older projects without this field receive the video title when opened on YouTube.

Schema 3 stores one `source` object with `provider` and `url`, or `null`. Older arrays migrate using the last source. Selecting another recording replaces the source. Export/import preserves lyrics, translations, timing and furigana.

## Japanese furigana

In the video's **Display & timing** panel, select **Generate furigana (dictionary)**. First use downloads EDICT2 and ENAMDICT from EDRDG and stores them in the extension's local IndexedDB. Generation then runs locally without sending lyrics to a service. **Show furigana** switches readings on or off for both the current and next original lyric line. Generation enables visibility; the switch itself never downloads anything.

Correct generated or imported readings under **Line editor → Edit furigana readings**. Readings cover the complete displayed dictionary word, including its kana; matching leading kana and okurigana are kept outside the ruby when displayed. Dictionary matching cannot guarantee the intended pronunciation of ambiguous words, names or creative sung readings. Unknown text stays unchanged. Editing original lyrics clears that line's annotations. Generation can restore them; regeneration replaces existing readings after confirmation. Repeating a line copies its readings.

Project JSON schema 3 stores a single `source` object (`provider` and `url`), or `null` when absent. Schema 1 and 2 imports retain only the last entry from their `sources` array. It preserves furigana segments and visibility, together with lyrics, translations and timing. Imported readings work without downloading dictionaries. Schema 1 projects migrate automatically with furigana off. LRC contains no furigana; use project JSON for full backups. Invalid annotations are rejected before replacing existing work.

The dictionary implementation is adapted from Furikazan (MIT, Copyright 2026 SilverwoodsLabs). EDICT2 and ENAMDICT are provided by the Electronic Dictionary Research and Development Group; see [dictionary licence and attribution](https://www.edrdg.org/edrdg/licence.html). The extension downloads dictionary data separately and does not bundle it.

Use **Correct a term throughout this song**, directly above **Line editor**, to apply an exact term and kana reading to every occurrence in the current project's original lyrics, for example `宝鐘 → ほうしょう`. This also merges terms split across dictionary segments. Line editor provides shortcuts to fill in an existing reading or enter a combined term. Corrections replace existing readings for that term and are saved in JSON exports. Other complete annotations remain unchanged; fragments cut from larger annotated words become unannotated rather than receiving guessed readings. Matching lines without furigana are generated first (requiring the dictionaries). Changes during generation discard the pending result. This is a project-wide edit, not a global dictionary rule: newly added or rewritten lines need the correction applied again.

The furigana dictionary button becomes **Re-generate furigana (dictionary)** when annotations exist. This regenerates all Japanese lines after confirmation, including manual corrections. Errors leave existing annotations intact.

**AI translation → Generate furigana** uses the same saved OpenAI key and selected model to process the complete original song as context. It does not require dictionaries or use the translation target language. API usage is billed by OpenAI; no audio is sent or analyzed. Existing readings, including manual corrections, are replaced only after confirmation. During generation the button is disabled and shows a spinner. Invalid, incomplete or stale results preserve existing work. Generated readings use the same editor, visibility toggle and JSON import/export as dictionary readings. Without an API key, dictionary generation remains available under Display & timing.

## Known limitations

- Full reference-performance timing validation remains outstanding; no audio analysis is implemented.
- Neither dictionary nor contextual AI readings guarantee the sung pronunciation. Review ambiguous words and names by ear.
- AI furigana has automated mocked-response coverage and user-confirmed live API generation; comprehensive Firefox visual/playback testing remains outstanding.
- Splitting/merging passages uses manual editing and adding/removing lines; dedicated split/merge controls are still planned.
- The last LRC line has an open end unless an end time is supplied; set its end in the editor to hide it after the final vocals.
- Current player integration targets desktop YouTube watch pages, not Shorts or embedded players.
- Automatic browser verification was unavailable because the Firefox debugging connection was not running. Unit and integration tests do not replace a playback review.

## Development

See [agents.md](agents.md) for the architecture, implementation sequence, and acceptance criteria. See [changelog.md](changelog.md) for release status and planned version scope.

Use English for code comments, identifiers, documentation, commit messages, and default interface text. Lyrics, translations, artist names, and song titles retain their original languages.

Run `npm test` for the core, search, translation, furigana, repository, launcher, bootstrap, tutorial and background tests and `npm run check` for JavaScript syntax checks. No npm dependencies are required. The test command uses Node.js 22 or newer.

Run `npm run package` to create `dist/runrun-karaoke-1.3.0.zip`, an unsigned extension package. Packaging uses Python 3 and includes the manifest, runtime assets, LICENSE and privacy.md. The packaging command does not sign or publish the add-on.

### Guided tutorial

After activating the interface, the tutorial opens Settings automatically once the video project is ready, if no previous tutorial visit has been saved. The purple **Tutorial** button in Settings reopens it at your saved step. Use **Previous**, **Next**, the chapter menu, or **×** (Escape) to navigate or stop. Progress is stored locally, separately from song projects.

The seven basic steps cover database search, dictionary furigana, lyric editing, reading corrections, global and individual timing, and playback. Correct readings automatically expands Edit furigana readings. Optional chapters cover AI translations, contextual furigana, recurring term corrections, live arrangements, computer backups and imports. Developer repository setup and publication are excluded. Controls remain usable during the guide; advancing a step does not run any action. On narrow screens the guide appears below Settings.

**Find lyrics** checks the public karaoke catalog when Settings opens and offers matching projects for the exact YouTube video ID. Loading asks before replacing existing lyrics. **Search LRCLIB** remains available as an alternative, including when the catalog is unavailable.

The header places **Close** beside the title, with **Tutorial**, **Privacy Policy** and **About** below. About contains the contact email link with subject ルンルンKARAOKE. Tutorial has no icon; the previous video icon is retained as a reserve asset. Tutorial highlighting disappears when the guide closes.

Each line offers **Add line before**, **Add line after**, **Jump to**, reorder arrows, **Repeat** and **Delete**. Jump to seeks the video to the line’s start including its offset, preserving paused playback. Empty projects offer **Add first line**. Delete asks for confirmation only if the line contains text, translations, furigana or timing.
