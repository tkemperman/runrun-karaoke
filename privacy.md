# Privacy Policy

Last updated: November 12, 2026

ルンルンKARAOKE provides editable bilingual karaoke lyrics on YouTube. The extension does not include advertising, analytics, or telemetry.

## Local data

The extension also keeps a local monthly API-usage ledger with provider/model, request/task identifier, timestamp, token counts or credits, and estimated costs. It contains no API keys, lyrics or audio and is excluded from project exports.

The extension stores karaoke projects, their catalog origin and local-change state, per-video automatic-loading preferences, video IDs and titles, lyrics, translations, timing information, search queries, preferences, and downloaded dictionaries locally in your Firefox profile. If you provide OpenAI, Genius or AudioShake API keys, they are stored locally in this extension’s private storage, which other extensions cannot access.

## External services

The extension contacts the following services for their respective features:

- **LRCLIB:** Lyrics searches send your search query, which may include a song title or artist, to lrclib.net.

- **Genius:** When LRCLIB returns no usable lyric text, search sends your query and Genius API token to api.genius.com. Selected search candidates are fetched from genius.com to extract lyrics. The API token is never sent to lyric pages. Blocked pages and connection failures are reported separately from empty results.

- **AudioShake and the Linux helper:** Only Generate timed lyrics starts processing. The helper downloads the current video’s complete audio from YouTube and uploads audio and, when selected, original lyrics as a transcript to api.audioshake.ai using your AudioShake key. AudioShake receives the selected language and a random request ID. The helper downloads JSON timing results from the service’s output storage. API charges may apply. Cancelling stops local work; a submitted remote task may continue. Temporary local audio and transcripts are removed after submission or handled failure/cancellation. An abrupt process kill or system crash may leave temporary files for manual removal. Keys are passed only to the corresponding service and temporarily to the helper; they are not written to helper files. Local task receipts contain request/video/task IDs and submission state so interrupted tasks can be resumed without automatic resubmission. Extension storage also keeps pending result data, the submitted transcript and project fingerprint until Discard or Apply. Project exports contain no keys, pending tasks or audio. AudioShake’s own retention policies apply to uploaded assets and results.

- **OpenAI:** When you request translation with optional furigana, the extension sends the project's lyrics, line identifiers, selected model, and target language where applicable to api.openai.com. Your OpenAI API key is sent to OpenAI for authentication. No video or audio is sent to OpenAI. Requests use `store: false`; this does not override OpenAI's own data retention policies.

- **GitHub:** Opening a YouTube video checks the configured public karaoke catalog by downloading its index from raw.githubusercontent.com and matching the video ID locally. When a local project has no user changes, an available English translation is downloaded and saved automatically. You can manually choose other translations. Deleting a local project disables automatic loading for that video until you manually load a project. These automatic public reads also occur while Karaoke is off and Settings is closed, and do not require a GitHub account or token.

- **YouTube:** Surprise Me sends candidate video URLs from the translations catalog to YouTube's oEmbed endpoint to skip removed videos before opening a random available video. Each unique candidate is checked at most once per click. No lyrics or translations are included in these checks.

- **EDRDG:** Dictionary-based furigana downloads Japanese dictionaries from www.edrdg.org and processes lyrics locally. Lyrics are not sent to EDRDG.

External services receive your IP address and standard connection information when contacted. Their own privacy policies govern their processing and retention of received data.

## Your choices

You can choose whether to use external-service features and can remove saved credentials through the extension's settings. Local extension data is removed when you uninstall the extension. The separately installed Linux helper and its task receipts can be removed with `sh install.sh --uninstall`; uninstalling the extension does not remove them. Uninstalling does not delete exported files or data retained by external services.

For privacy questions, contact [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com?subject=%E3%83%AB%E3%83%B3%E3%83%AB%E3%83%B3KARAOKE).
