# YouTube Karaoke

A Firefox add-on in development for synchronized lyrics on YouTube, with the original text above its translation. Designed to support Japanese kanji and kana, live performances, and editable timing for each video.

## Project status

Version **1.0.0 is under development**, ready for manual testing as a temporary Firefox add-on. It is not a signed public release and does not yet meet every version 1.0.0 acceptance criterion.

Implemented: a bilingual overlay, per-video local storage, manual timing, LRC and JSON import/export, LRCLIB search, and configurable activation/display settings. No real song lyrics or verified timing are bundled.

## Planned features

### Version 1.0.0

- Line-based karaoke overlay with translations directly underneath.
- Lyrics lookup through LRCLIB, with recording selection and manual search corrections.
- Manual lyrics and translation entry, LRC import, and translation mapping.
- A timing editor for live arrangements, repeated lines, and instrumental breaks.
- Per-video timing offsets and local project storage.
- JSON import/export preserving text, translations, sources, and timing.
- Synchronization across pausing, seeking, playback speed changes, and fullscreen.

### Version 2.0.0

- Audio analysis to align lyrics with the actual performance.
- Word or Japanese text segment timing and highlighting where reliable.
- Review and correction of uncertain alignment results.
- Continued support for manual timing and existing projects.

Audio input, processing architecture, and model choice will be determined through a prototype. Automatic timing quality is not yet established.

## Lyrics and translation sources

Lyrics are retrieved through LRCLIB. Translations are entered manually or imported in a project JSON file; there is no automatic translation or translation fetching.

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

New tabs start with karaoke off. Activation is per tab; projects and display preferences are saved locally. A temporary add-on must be loaded again after restarting Firefox. This preview uses Firefox Manifest V2 and requires no build step.

## First playback test

1. Activate karaoke and open **Paste lyrics & import / export** in the editor.
2. Click **Load original demo (not song lyrics)**. This replaces the current project lines after confirmation.
3. Play from 0 seconds: the first Japanese/English pair appears from 0–5 seconds, the second from 5–10, a blank interval from 10–12, and the third from 12–17.
4. Check pause, backward/forward seeking, playback speed, fullscreen, and Alt+K. The microphone button should reflect the same on/off state.
5. For real lyrics, search LRCLIB or paste/import text. Use **Manual translation → Apply translation**, or enter each English passage under its matching original line in **Line editor**. Select the first line and mark it as the vocals begin; **Alt+Shift+M** marks successive lines while the editor is open and focus is outside text fields.
6. Export a JSON backup, reload the page, and check that timing and translations were preserved.

The overlay is centered inside `#movie_player`, above its controls. Its default bottom offset is 13% of player height; adjust it in Settings to avoid existing subtitles. The downloaded HTML confirms the player root ID but does not contain the rendered video element. Placement still needs visual testing in normal, theater, and fullscreen modes.

## Lyrics search and artist aliases

The search field accepts a YouTube title or a manually corrected song/artist query. Search derives a likely song title from a spaced dash separator, removes familiar video annotations, and detects artists using the explicit alias groups in `src/search.js`.

For example, `FuwaMoco x Senchou Sing - Ahoy!` produces searches including `Ahoy! 宝鐘マリン`, `Ahoy! Houshou Marine`, and `Ahoy! FUWAMOCO`. Each recognized artist is searched separately because a cover performer may differ from the artist listed in LRCLIB. The initial groups cover Marine (including Houshou Marin and Senchou) and FUWAMOCO.

Search tries up to eight distinct artist/title combinations, with at most two requests in flight. If these return no recordings, it tries the original query and the extracted title. Results are merged by LRCLIB ID, ranked by artist-alias and title overlap, and limited to 40 recordings. Successful results survive failures in other requests; failures are reported when no results are available. Choose the recording manually; a match does not imply that studio timing fits a live performance.

To extend the aliases, add spellings to an artist's array in `src/search.js`, placing the preferred catalog spelling first, or add a new artist group. Matching normalizes Unicode, letter case, punctuation, and whitespace, and requires whole normalized words. Aliases are curated in code, not learned automatically. Selected recording metadata continues to be saved with the video project.

Automatic translation and general romaji-to-Japanese conversion are intentionally excluded from search. A Japanese spelling is searched only when explicitly present in an alias group. Unknown names and titles can be corrected manually in the search field. Manual lyric translations remain supported.

## Display and timing

The gear toggles the editor open or closed. The Close button also closes it. **Display & timing** controls the timing delay (positive means later), text size, distance above the video bottom, and **Show next line**. The checkbox and its clickable label share one row. Toggle karaoke with the microphone button or Alt+K; there is no duplicate on/off button in the editor.

## Applying translations

Paste a translation under **Manual translation** and click **Apply translation** to assign non-empty lines in order to non-empty lyrics blocks. Blank instrumental blocks are skipped. Different non-empty line counts show a warning. Choose **Apply anyway** to apply the available pairs, keeping unmatched original lines unchanged and ignoring extra translation lines, or **Cancel** to leave translations unchanged. This matches by position, not meaning, so review the opened **Line editor**, especially for live arrangements and repeated passages. Replacing existing translations requires confirmation. Applied translations are saved locally and use the original timing; unapplied pasted text is temporary. Individual editing and JSON import remain available.

## Known preview limitations

- No verified synchronization for the reference song and no audio analysis.
- Splitting/merging passages uses manual editing and adding/removing lines; dedicated split/merge controls are still planned.
- The last LRC line has an open end unless an end time is supplied; set its end in the editor to hide it after the final vocals.
- Current player integration targets desktop YouTube watch pages, not Shorts or embedded players.
- Automatic browser verification was unavailable because the Firefox debugging connection was not running. Unit and integration tests do not replace a playback review.

## Development

See [agents.md](agents.md) for the architecture, implementation sequence, and acceptance criteria. See [versions.md](versions.md) for release status and planned version scope.

Use English for code comments, identifiers, documentation, commit messages, and default interface text. Lyrics, translations, artist names, and song titles retain their original languages.

Run `npm test` for the core and background integration tests and `npm run check` for JavaScript syntax checks. No npm dependencies are required. The test command uses Node.js 22 or newer.

Run `npm run package` to create an unsigned ZIP in `dist/`. Packaging uses Python 3 and includes only the manifest and runtime assets. Public Firefox distribution and signing are future release steps.
