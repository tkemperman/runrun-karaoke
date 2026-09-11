# ルンルンKARAOKE

<p align="center">
  <img src="assets/mascot.png" width="256" height="256" alt="A cheerful turquoise karaoke mascot singing with a musical-note speech balloon">
</p>

A Firefox add-on in development for synchronized lyrics on YouTube, with the original text above its translation. Designed to support Japanese kanji and kana, live performances, and editable timing for each video.

## Contact

Thomas Kemperman — [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com)

## License

Licensed under the [MIT License](LICENSE). Copyright (c) 2026 Thomas Kemperman.
Lyrics and translations obtained from external sources are not covered by this project's license.

## Project status

Version **1.1.0 was released on September 11, 2026**, adding local and AI furigana generation. Version 1.0.0 was released on September 10, 2026; see [versions.md](versions.md). The current local package is unsigned. The user confirmed successful AI furigana generation with a live API request on September 11, 2026. Full Firefox acceptance testing remains outstanding.

Implemented: a bilingual overlay, per-video local storage, manual timing and synchronization controls, LRC and JSON import/export, LRCLIB search, optional AI translations, toggleable Japanese furigana with dictionary and AI generation, editable readings and song-wide term corrections, and configurable activation/display settings. No demo, real song lyrics, or verified timing are bundled.

## Feature scope

### Version 1.1.0

- Line-based karaoke overlay with translations directly underneath.
- Lyrics lookup through LRCLIB, with recording selection and manual search corrections.
- Manual lyrics and translation entry, LRC import, and translation mapping.
- A timing editor for live arrangements, repeated lines, and instrumental breaks.
- Per-video timing offsets and local project storage.
- JSON import/export preserving text, translations, sources, timing, furigana readings, and visibility.
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

Lyrics are retrieved through LRCLIB. Translations can be entered manually, imported in a project JSON file, or generated with OpenAI.

Apply translation assigns pasted translations by line order. Review and correct the passages manually in Line editor. Studio timing may need substantial adjustment for live performances.

## Reference performance

The initial acceptance case is [Houshou Marine — Ahoy!! Warera Houshou Kaizokudan☆](https://www.youtube.com/watch?v=h3chCOV_phw), using Japanese lyrics with an [English translation](https://myjpop.jspinyin.net/lyrics-houshou-marine-ahoy-warera-houshou-kaizokudan%E2%98%86-ahoy-%E6%88%91%E3%82%89%E5%AE%9D%E9%90%98%E6%B5%B7%E8%B3%8A%E5%9B%A3%E2%98%86-%E6%AD%8C%E8%A9%9E/) directly underneath.

The downloaded page identifies the video as “FuwaMoco x Senchou Sing - Ahoy!”, lasting 309 seconds. Its metadata lists Japanese automatic captions, but retrieving the track returned an empty response. Actual lyric timing still requires review during playback.

## Install the development preview

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on…** and select this repository's `manifest.json`.
3. Open or reload a YouTube watch page.
4. Press **Alt+K**, or click the microphone **Karaoke** button after the Transcript tools beside the channel information. If the Transcript extension is absent, the button appears at the end of the same owner row.
5. Click the gear beside **Karaoke** to open the lyrics and timing editor; click it again to close the editor. Click the extension toolbar icon to open **Settings** directly. Change the activation shortcut, text size, or vertical position there. **Open lyrics editor for this video** opens the editor.

New tabs start with karaoke off. Activation is per tab; projects and display preferences are saved locally. A temporary add-on must be loaded again after restarting Firefox. This preview uses Firefox Manifest V2, requires Firefox 140 or newer, and requires no build step.

Firefox's installation consent declares search terms, website content, and authentication information. Lyrics searches send the query (which can contain the video title) to LRCLIB. Automatic translation sends the original lyrics, block IDs, target language, and selected model to OpenAI, using your API key for authentication. AI furigana generation sends the complete original lyrics, block IDs and selected model to OpenAI using the same saved key. These requests occur when you use the corresponding feature; entering lyrics and translations manually remains available without them. Projects and the saved key stay in extension-local storage except for these explicit requests and user-triggered exports. Dictionary generation downloads EDICT2 and ENAMDICT from EDRDG on first use, caches them locally, and does not send lyrics to EDRDG. Export project JSON before switching extension IDs or removing a development installation; the current ID is `runrun-karaoke@silverwoodslabs`, and data from a different extension ID is not automatically migrated.

## First playback test

1. Activate karaoke and open the lyrics editor.
2. Search LRCLIB or paste/import lyrics under **Paste lyrics & import / export**.
3. Use **Manual translation → Apply translation**, or enter each English passage under its matching original line in **Line editor**. If timing needs adjustment, select the first line and mark it as the vocals begin; **Alt+Shift+M** marks successive lines while the editor is open and focus is outside text fields.
4. Play the video and check pause, backward/forward seeking, playback speed, fullscreen, and Alt+K. The microphone button should reflect the same on/off state.
5. Generate furigana through **AI translations** with an API key, or through the dictionary button in **Display & timing** without one. Check current/next-line ruby and toggle **Show furigana**.
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

The gear toggles the editor open or closed. The Close button also closes it. **Display & timing** controls the timing delay (positive means later), text size, distance above the video bottom, **Show next line**, and **Show furigana**. The checkbox and its clickable label share one row. Toggle karaoke with the microphone button or Alt+K; there is no duplicate on/off button in the editor.

Use **Start at** to set when the first timed, non-empty lyric should appear, in `minutes:seconds` (for example, `0:33`). The delay is calculated automatically from its original timestamp. Alternatively, select a timed line in **Line editor** and click **Sync with video position** beside the field when that line should begin. This rounds the current video position to the nearest whole second and calculates the delay for the selected line. Both controls shift all lyrics together while preserving their relative timing; **Start at** continues to show the first lyric's adjusted start.

**Start (s)** and **End (s)** in Line editor show video times including the delay and update when it changes. Editing these values converts them back to stored timestamps automatically. For example, a first lyric at `15.27` seconds with **Start at** set to `0:33` produces a delay of `17.73` seconds and an editor start of `33`. Synchronizing does not turn karaoke on; activate it with **Karaoke** or **Alt+K** to see the overlay.

## Applying translations

Paste a translation under **Manual translation** and click **Apply translation** to assign non-empty lines in order to non-empty lyrics blocks. Blank instrumental blocks are skipped. Different non-empty line counts show a warning. Choose **Apply anyway** to apply the available pairs, keeping unmatched original lines unchanged and ignoring extra translation lines, or **Cancel** to leave translations unchanged. This matches by position, not meaning, so review the opened **Line editor**, especially for live arrangements and repeated passages. Replacing existing translations requires confirmation. Applied translations are saved locally and use the original timing; unapplied pasted text is temporary. Individual editing and JSON import remain available.

## AI translations

Open **AI translations**, below **Manual translation**, enter your OpenAI API key, select a model (GPT-6 Astra by default, GPT-5.6 Sol/Terra/Luna, GPT-5.5, GPT-5, GPT-4.1, GPT-4o, or GPT-4o mini), and choose a translation language code. Your key, provider, model, and language preferences persist in the extension’s local storage. The key is not included in project JSON exports; use **Remove saved API key** to delete it.

**Translate all lines** sends all original lines together to OpenAI for context. API usage is billed to your OpenAI account. Strict JSON output pairs each translation with its original block ID. Invalid, incomplete, or stale results leave existing translations unchanged. Replacing existing translations requires confirmation. Review the translations in Line editor; timings and other language translations are preserved.

While the request is running, the button shows a spinner and **Translating…** and is disabled to prevent duplicate requests. It becomes available again when the operation finishes or fails.

The default model option uses the API model ID `gpt-6-astra`; model choices are configured in the source.

Model choices were checked against the [OpenAI model catalog](https://developers.openai.com/api/docs/models) on September 9, 2026. Availability for your API key depends on your account and model access.

## Japanese furigana

In the video's **Display & timing** panel, select **Generate furigana (dictionary)**. First use downloads EDICT2 and ENAMDICT from EDRDG and stores them in the extension's local IndexedDB. Generation then runs locally without sending lyrics to a service. **Show furigana** switches readings on or off for both the current and next original lyric line. Generation enables visibility; the switch itself never downloads anything.

Correct generated or imported readings under **Line editor → Edit furigana readings**. Readings cover the complete displayed dictionary word, including its kana; matching leading kana and okurigana are kept outside the ruby when displayed. Dictionary matching cannot guarantee the intended pronunciation of ambiguous words, names or creative sung readings. Unknown text stays unchanged. Editing original lyrics clears that line's annotations. Generation can restore them; regeneration replaces existing readings after confirmation. Repeating a line copies its readings.

Project JSON schema 2 preserves furigana segments and visibility, together with lyrics, translations and timing. Imported readings work without downloading dictionaries. Schema 1 projects migrate automatically with furigana off. LRC contains no furigana; use project JSON for full backups. Invalid annotations are rejected before replacing existing work.

The dictionary implementation is adapted from Furikazan (MIT, Copyright 2026 SilverwoodsLabs). EDICT2 and ENAMDICT are provided by the Electronic Dictionary Research and Development Group; see [dictionary licence and attribution](https://www.edrdg.org/edrdg/licence.html). The extension downloads dictionary data separately and does not bundle it.

Use **Correct a term throughout this song**, directly above **Line editor**, to apply an exact term and kana reading to every occurrence in the current project's original lyrics, for example `宝鐘 → ほうしょう`. This also merges terms split across dictionary segments. Line editor provides shortcuts to fill in an existing reading or enter a combined term. Corrections replace existing readings for that term and are saved in JSON exports. Other complete annotations remain unchanged; fragments cut from larger annotated words become unannotated rather than receiving guessed readings. Matching lines without furigana are generated first (requiring the dictionaries). Changes during generation discard the pending result. This is a project-wide edit, not a global dictionary rule: newly added or rewritten lines need the correction applied again.

The furigana dictionary button becomes **Re-generate furigana (dictionary)** when annotations exist. This regenerates all Japanese lines after confirmation, including manual corrections. Errors leave existing annotations intact.

**AI translations → Generate furigana** uses the same saved OpenAI key and selected model to process the complete original song as context. It does not require dictionaries or use the translation target language. API usage is billed by OpenAI; no audio is sent or analyzed. Existing readings, including manual corrections, are replaced only after confirmation. During generation the button is disabled and shows a spinner. Invalid, incomplete or stale results preserve existing work. Generated readings use the same editor, visibility toggle and JSON import/export as dictionary readings. Without an API key, dictionary generation remains available under Display & timing.

## Known preview limitations

- Full reference-performance timing validation remains outstanding; no audio analysis is implemented.
- Neither dictionary nor contextual AI readings guarantee the sung pronunciation. Review ambiguous words and names by ear.
- AI furigana has automated mocked-response coverage and user-confirmed live API generation; comprehensive Firefox visual/playback testing remains outstanding.
- Splitting/merging passages uses manual editing and adding/removing lines; dedicated split/merge controls are still planned.
- The last LRC line has an open end unless an end time is supplied; set its end in the editor to hide it after the final vocals.
- Current player integration targets desktop YouTube watch pages, not Shorts or embedded players.
- Automatic browser verification was unavailable because the Firefox debugging connection was not running. Unit and integration tests do not replace a playback review.

## Development

See [agents.md](agents.md) for the architecture, implementation sequence, and acceptance criteria. See [versions.md](versions.md) for release status and planned version scope.

Use English for code comments, identifiers, documentation, commit messages, and default interface text. Lyrics, translations, artist names, and song titles retain their original languages.

Run `npm test` for the core, search, translation, furigana, and background tests and `npm run check` for JavaScript syntax checks. No npm dependencies are required. The test command uses Node.js 22 or newer.

Run `npm run package` to create `dist/runrun-karaoke-1.1.0.zip`, an unsigned extension package. Packaging uses Python 3 and includes only the manifest and runtime assets. The packaging command does not sign or publish the add-on.
