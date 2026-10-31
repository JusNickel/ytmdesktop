Windows x64 installers and Linux x86_64 RPMs for the two separate apps:

- **YouTube-Desktop-AdBlock-Setup.exe** — regular YouTube videos, desktop controls, settings, floating mini player, and optional Discord/Vesktop Rich Presence.
- **YouTube-Music-AdBlock-Setup.exe** — the original YouTube Music app and integrations.
- **youtube-desktop-adblock-*.rpm** and **youtube-music-desktop-app-*.rpm** — Linux packages for Fedora-compatible x86_64 systems.

Close the relevant app before installing. The two apps use different installation identities and profiles and can coexist. Windows installers are unsigned. Compare downloads with `SHA256SUMS.txt` if needed.

The video app automatically refreshes its first in-page video navigation once. Ad detection covers modern skip buttons and visible ad badges; blocking every YouTube ad is not guaranteed. Enable Rich Presence in Settings with Discord or Vesktop running.

Both installers are built on Windows. Automated checks exercise the packaged blocker and the video app's actual packaged controls/settings/mini player. Live account sign-in and every YouTube player experiment are not covered.
