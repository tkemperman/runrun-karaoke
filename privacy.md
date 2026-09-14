# Privacy Policy

Last updated: September 14, 2026

ルンルンKARAOKE provides editable bilingual karaoke lyrics on YouTube. The extension does not include advertising, analytics, or telemetry.

## Local data

The extension stores karaoke projects, video IDs and titles, lyrics, translations, timing information, search queries, preferences, and downloaded dictionaries locally in your Firefox profile. If you provide an OpenAI API key, it is stored locally in this extension’s private storage, which other extensions cannot access.

## External services

The extension contacts the following services for their respective features:

- **LRCLIB:** Lyrics searches send your search query, which may include a song title or artist, to lrclib.net.

- **OpenAI:** When you request AI translation or AI furigana, the extension sends the project's lyrics, line identifiers, selected model, and target language where applicable to api.openai.com. Your OpenAI API key is sent to OpenAI for authentication. No video or audio is uploaded. Requests use `store: false`; this does not override OpenAI's own data retention policies.

- **GitHub:** Opening Settings checks the public karaoke catalog for the current video by downloading its index from raw.githubusercontent.com and matching the YouTube ID locally. Loading a match downloads its project file. These public catalog requests do not require a GitHub account or token.

- **EDRDG:** Dictionary-based furigana downloads Japanese dictionaries from www.edrdg.org and processes lyrics locally. Lyrics are not sent to EDRDG.

External services receive your IP address and standard connection information when contacted. Their own privacy policies govern their processing and retention of received data.

## Your choices

You can choose whether to use external-service features and can remove saved credentials through the extension's settings. Local extension data is removed when you uninstall the extension. Uninstalling does not delete exported files or data retained by external services.

For privacy questions, contact [thomas@silverwoodslabs.com](mailto:thomas@silverwoodslabs.com?subject=%E3%83%AB%E3%83%B3%E3%83%AB%E3%83%B3KARAOKE).
