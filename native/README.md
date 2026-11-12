# Linux audio helper

Extract the helper archive and run `sh install.sh` as your normal user. The script reads `/etc/os-release` (`ID` and `ID_LIKE`), chooses an available distribution package manager, and queries its repositories before displaying a dependency command. It never runs sudo. Return to extension Settings and choose **Check again** after installing dependencies.

- Arch / EndeavourOS: checks `pacman -Si`, then suggests `sudo pacman -S --needed python ffmpeg yt-dlp deno` only if all packages exist. Official repositories take priority over yay/AUR.
- Debian / Ubuntu: checks `apt-cache show` for Python 3, FFmpeg, yt-dlp and Deno. Some releases do not ship Deno; in that case no unverified install command is printed.
- Fedora: checks `dnf repoquery --available`, using the official FFmpeg package candidate `ffmpeg-free`.
- openSUSE: checks exact package matches with zypper.
- Other distributions or missing repository packages: use your distribution documentation for Python 3.10+, FFmpeg with ffprobe, yt-dlp and Deno. The script does not guess an installation command.

Use `sh install.sh --check` to inspect dependencies without installing the helper. Manual selection uses `sh install.sh --distro arch` (also `debian`, `fedora`, `opensuse`, `unknown`). Package availability is still checked locally. Refresh your repository metadata yourself if checks fail.

The user installation is `~/.local/share/runrun-karaoke-helper`, registered through `~/.mozilla/native-messaging-hosts/com.runrun.karaoke.json` for `runrun-karaoke@silverwoodslabs`. Firefox must have access to this host location; sandboxed Flatpak/Snap installations may need their native messaging integration configured separately.

Update: extract a new archive and run `sh install.sh` again. Remove: `sh install.sh --uninstall`. This removes helper files and local task receipts, not extension projects or remote tasks. System dependencies are not removed automatically.

## Processing and recovery

The helper downloads complete public YouTube audio via yt-dlp, checks duration and live status, converts it to MP3 using FFmpeg, uploads it plus an optional UTF-8 transcript, and creates one AudioShake `alignment` target with JSON output. Auto omits the API language field. Audio is never trimmed, so timestamps are relative to video start. Videos over 45 minutes and unfinished livestreams are rejected.

Task receipts under `~/.local/state/runrun-karaoke-helper` contain only request IDs, video IDs, submission state and task IDs. Credentials remain in extension storage and transient helper memory. Audio and transcript files use a private temporary directory removed after submission or on handled failure/cancellation. Force-killing the helper or a system crash can leave temporary directories under the system temporary directory; remove stale `runrun-audio-*` directories after confirming no helper is running.

Resume polls the recorded task; it never creates a second task. The helper records submission intent before POST. If a connection dies before the task ID is received, the outcome is uncertain: inspect your AudioShake dashboard before discarding and starting a new task. Cancellation stops local downloads/polling; an already submitted remote task may continue and incur charges. AudioShake retains uploaded data under its own policies.

Protocol v1 uses Firefox length-prefixed JSON on stdin/stdout: `status`, `start`, `cancel`; responses are `status`, `progress`, `task`, `billing`, `result`, `error`, `cancelled`. Billing messages carry the API-reported task credit cost for the extension’s usage ledger. Start carries a UUID request ID, video ID, finite duration, language, optional transcript, optional saved task ID and an in-memory key. No network response bodies or keys are logged.

API references: [Create task](https://developer.audioshake.ai/api-reference/tasks/create), [uploads](https://developer.audioshake.ai/upload-file), [models and duration limits](https://developer.audioshake.ai/models).
