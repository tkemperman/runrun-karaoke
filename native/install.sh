#!/bin/sh
# Detect dependencies, print verified system commands, then install only user files.
set -eu
cd "$(dirname "$0")"
if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$HOME/.mozilla/native-messaging-hosts/com.runrun.karaoke.json"
  rm -rf "$HOME/.local/share/runrun-karaoke-helper" "$HOME/.local/state/runrun-karaoke-helper"
  echo 'Removed the native helper and local task receipts. Extension projects and remote tasks are unchanged.'
  exit 0
fi
ID=unknown ID_LIKE=
if [ -r /etc/os-release ]; then . /etc/os-release; fi
if [ "${1:-}" = "--distro" ]; then ID="$2"; ID_LIKE=; shift 2; fi
family=unknown
case " $ID $ID_LIKE " in
  *' arch '*|*' endeavouros '*) family=arch;;
  *' debian '*|*' ubuntu '*) family=debian;;
  *' fedora '*|*' rhel '*) family=fedora;;
  *' opensuse '*|*' opensuse-tumbleweed '*|*' opensuse-leap '*|*' suse '*) family=opensuse;;
esac
printf 'Detected distribution: %s (family: %s)\n' "$ID" "$family"
verified=true
case "$family" in
  arch) manager=pacman; packages='python ffmpeg yt-dlp deno'; install='sudo pacman -S --needed';;
  debian) manager=apt-cache; packages='python3 ffmpeg yt-dlp deno'; install='sudo apt install';;
  fedora) manager=dnf; packages='python3 ffmpeg-free yt-dlp deno'; install='sudo dnf install';;
  opensuse) manager=zypper; packages='python3 ffmpeg yt-dlp deno'; install='sudo zypper install';;
  *) manager=; packages=; install=; verified=false;;
esac
if [ -n "$manager" ] && command -v "$manager" >/dev/null 2>&1; then
  for package in $packages; do
    case "$family" in
      arch) pacman -Si "$package" >/dev/null 2>&1 || verified=false;;
      debian) apt-cache show "$package" 2>/dev/null | grep -q '^Package:' || verified=false;;
      fedora) dnf -q repoquery --available "$package" 2>/dev/null | grep -q . || verified=false;;
      opensuse) zypper --non-interactive search --match-exact --type package "$package" 2>/dev/null | grep -Eq "[|] *$package *[|]" || verified=false;;
    esac
  done
else verified=false; fi
if [ "$verified" = true ]; then
  printf 'Verified in configured repositories. Run in your terminal if needed:\n%s %s\n' "$install" "$packages"
else
  echo 'Could not verify all dependencies in configured repositories; no install command is suggested.'
  echo 'Install Python 3.10+, FFmpeg (including ffprobe), yt-dlp and Deno using your distribution documentation.'
  echo 'Update your repository metadata and run this script again. No AUR helper is used.'
fi
if [ "${1:-}" = "--check" ]; then exit 0; fi
if ! command -v python3 >/dev/null 2>&1; then echo 'Install Python first, then run this script again.'; exit 1; fi
python3 install.py
