# Privacy Policy — ルンルンKARAOKE

Last updated: September 12, 2026

ルンルンKARAOKE provides editable bilingual karaoke lyrics on YouTube. The extension does not include advertising, analytics, or telemetry.

## Local data

The extension stores karaoke projects, video IDs and titles, lyrics, translations, timing information, search queries, preferences, and downloaded dictionaries locally in your Firefox profile. If you provide an OpenAI API key or GitHub token, it is also stored locally.

## External services

The extension contacts the following services for their respective features:

- **LRCLIB:** Lyrics searches send your search query, which may include a song title or artist, to lrclib.net.

- **OpenAI:** When you request AI translation or AI furigana, the extension sends the project's lyrics, line identifiers, selected model, and target language where applicable to api.openai.com. Your OpenAI API key is sent to OpenAI for authentication. No video or audio is uploaded. Requests use `store: false`; this does not override OpenAI's own data retention policies.

- **GitHub:** Repository browsing and loading request catalog and project files from raw.githubusercontent.com. Checking an upload destination and publishing use api.github.com with your GitHub token. Publishing uploads the karaoke project, including video metadata, lyrics, translations, timing, and furigana, to your configured repository. Content published to a public repository is publicly accessible.

- **EDRDG:** Dictionary-based furigana downloads Japanese dictionaries from www.edrdg.org and processes lyrics locally. Lyrics are not sent to EDRDG.

External services receive your IP address and standard connection information when contacted. Their own privacy policies govern their processing and retention of received data. Authentication credentials are sent only to their respective services and are not included in published karaoke projects.

## Your choices

You can choose whether to use external-service features and can remove saved credentials through the extension's settings. Local extension data is removed when you uninstall the extension. Uninstalling does not delete exported files, published GitHub content, or data retained by external services.

For privacy questions, please use the support contact provided on this add-on's listing.
