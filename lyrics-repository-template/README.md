# Karaoke lyrics repository

Template for ルンルンKARAOKE **1.2.0**, released September 12, 2026. Project JSON uses schema 3; the catalog index remains schema 1.

Copy **all contents of this directory, including `.github`**, into the root of a new public GitHub repository. Commit these files to `main` (or your chosen branch). The repository must already have that branch before publishing from the add-on. Enable GitHub Actions and allow the workflow to write repository contents; branch protection must allow its catalog commit. Run **Actions → Update lyrics catalog → Run workflow** once to check setup.

In ルンルンKARAOKE Settings, set the retrieval repository and branch. For uploads, set the upload repository and branch separately and save a fine-grained GitHub personal access token restricted to that repository with **Contents: read and write**. The saved token appears masked in the password field; Repository fields and token changes save automatically on change. **Clear token** immediately deletes the stored token. Never commit your token. Public retrieval never uses it.

In the YouTube lyrics editor, open **Lyrics repositories · GitHub**. **Search repository** fetches `index.json`, initially showing projects for the current video. A title, artist or video ID filter searches the entire catalog. Loading requires the matching YouTube video and confirms replacement of existing work. There is no background polling or automatic replacement.

**Publish project to GitHub** confirms the exact repository, branch and filename before uploading the complete schema 3 project. Files use `translations/SANITIZED_VIDEO_TITLE-VIDEO_ID/LANGUAGE.json`: one project per video and selected translation language, containing all translation languages present in that project. Re-publishing updates that file. Concurrent changes cause an error; check and publish again. Other contributors need write access and their own token; this version does not create forks or pull requests.

A push to `translations/` triggers the included Action, which validates every project and regenerates `index.json`. Allow the Action to finish and raw GitHub caches to refresh before searching again. Failed validation leaves the previous index intact; inspect the workflow logs, fix the file, and rerun. Protected branches or read-only workflow permissions can prevent index commits. The Action never publishes lyrics by itself.

## License

The software and technical documentation are available under the [MIT License](LICENSE),
so you can reuse the code to set up your own lyrics and translation repository.

**Song lyrics and translations are not covered by the MIT License.** Rights remain
with the respective rights holders; this repository grants no license to that
content. See [CONTENT_NOTICE.md](CONTENT_NOTICE.md) for details.

## Format

Project files use the add-on's JSON export schema (schema 1 and 2 imports migrate to 3). Keep `scripts/core.js` and `scripts/repositories.js` aligned with the add-on when upgrading validation. The generated index has its own schema version:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "file": "translations/example-video-abcdefghijk/en.json",
      "videoId": "abcdefghijk",
      "title": "Example song",
      "artist": "Example artist",
      "originalLanguage": "ja",
      "translationLanguage": "en"
    }
  ]
}
```

Generate locally with `node scripts/build-index.js` (Node 22 or newer). Paths must stay within `translations/`; files and catalog must not exceed 3 MB. This template contains no lyrics. See [CONTENT_NOTICE.md](CONTENT_NOTICE.md) for the rights notice covering lyrics and translations.

Repository folder titles come from the current YouTube video, independently of the lyric/translation title. Folder titles use lowercase Unicode letters and numbers (including Japanese), with whitespace and punctuation converted to single hyphens. Repeated hyphens collapse and leading/trailing hyphens are removed. Slugs are limited to 220 UTF-8 bytes; empty slugs use `untitled`. The YouTube ID keeps its original case. Matching and loading use the exact YouTube video ID, independently of the title or folder name. Existing ID-only catalog paths remain readable. Changing the YouTube video title changes its upload path.

Project JSON includes `videoUrl` (`https://www.youtube.com/watch?v=VIDEO_ID`), derived from the matching `videoId`. Older imports receive it automatically; schema 3 remains compatible.

`videoTitle` preserves the original YouTube video title, including case, punctuation and Japanese characters. It is separate from the lyric `title`; only the folder name is sanitized. Older projects without this field receive the video title when opened on YouTube.
