# ルンルンKARAOKE Lyrics Repository

Set up your own public lyrics and translation repository for ルンルンKARAOKE.
This template contains no lyrics.

This template was reviewed with extension release 1.5.0. Project schema 4 and catalog schema 1 are unchanged. Update scripts/core.js from this template before publishing manual kanji annotations above kana (reverse ruby), so the catalog validator accepts them.

## Setup

1. **Create your repository.** Create an empty **public** repository on GitHub. Copy everything from this template directory, including the hidden `.github` directory, into its root and commit it to `main`. If working in a local clone, push it to GitHub before continuing. Alternatively, [fork the existing catalog](https://github.com/tkemperman/runrun-karaoke-lyrics-catalog/fork).

2. **Enable GitHub Actions.** In your repository, open **Actions** and enable workflows if prompted. Run **Update lyrics catalog → Run workflow** on `main` and wait for it to finish successfully.

3. **Create a GitHub token.** Open [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens) and click **Generate new token**. Give it a name and expiration date, select your account as **Resource owner**, and choose **Only select repositories → your new repository**. Under **Repository permissions**, set **Contents → Read and write**, then generate and copy the token. [GitHub's token guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) has more detail.

4. **Configure ルンルンKARAOKE.** Enable developer mode from the YouTube page console with `localStorage.setItem("runrunKaraoke.developerMode", "true")` and reload. Open the extension's **Settings → Lyrics repositories · GitHub** and enter:

   | Field | Value |
   | --- | --- |
   | Repository for search and publication | `YOUR-USERNAME/YOUR-REPOSITORY` |
   | Branch | `main` |
   | GitHub token | The token you just copied |

   Settings save automatically when you leave a field. Keep the token private; never add it to the repository.

5. **Publish or load lyrics.** On YouTube, open the lyrics editor and expand **Lyrics repositories · GitHub**. Use **Publish to GitHub**, review the repository, branch and file paths shown inside Settings, then choose **Confirm publication** to publish the current translation to its language file (such as en.json, fr.json or nl.json), preserving other language files. Each language file contains its translation and shared original lyrics, timing, furigana and display settings. **Cancel** leaves the repository unchanged. If you edit the project while reviewing, start publication again. The catalog Action starts only after a successful upload commit; simply opening the review does not trigger a run. After the repository's Action finishes, use **Find lyrics → Use lyrics translation from catalog** to load it. The generated catalog can also supply random videos to **Surprise Me** from this same repository.

The Action generates `index.json` from the project files. The extension searches that index by `videoId` and loads the recorded file path; it does not scan folder names. Renaming a YouTube video does not prevent existing projects from being found. The downloaded project’s `videoId` is also validated before loading.

## License

Code and technical documentation are licensed under [MIT](LICENSE).
**Lyrics and translations are excluded**; rights remain with their respective
rights holders. See [CONTENT_NOTICE.md](CONTENT_NOTICE.md).

Projects use schema 4; the included validators also read schemas 1–3. Update the scripts in an existing catalog from this template before publishing schema 4 projects. The index lists available translation languages. Public English auto-loading never replaces local user changes. Deleting a GitHub file requires a separate browser confirmation and leaves the local project intact.
