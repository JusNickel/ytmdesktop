# Built-in ad blocking

This fork adds **Settings â†’ Playback â†’ Block ads**, enabled by default.
Reload the music page after changing it so injected filters are refreshed.

The Ghostery Electron engine filters ad requests in the YouTube Music session
only. Development uses its separate music session. The engine is attached before
the music view starts loading and remains attached when that view is recreated.
The existing Google sign-in navigation and security settings are preserved.

A small bundled set of network rules covers the first launch offline. The full
ads-only filter engine downloads in the background with a ten-second timeout per
request. Its serialized cache lives at `adblock-engine.bin` in the app's user data
directory. A cache younger than 24 hours is reused; an older cache is refreshed
when blocking is next enabled. Download failures retain the existing engine.
Disabling blocking prevents a pending download from turning blocking back on.

The music preload also checks for YouTube's explicit ad player classes every
500 ms. It clicks an available skip button or seeks a finite ad to its end.
It leaves ordinary songs, playback speed, volume, and live streams alone.
This helper is restricted to `music.youtube.com` by the existing preload guard.

YouTube changes can break filtering or ad detection. This is a first implementation,
not a guarantee of removing every advertisement. Live signed-in playback and
regional behavior still need manual testing before publishing a release.

## Verification

Install dependencies using the project's pnpm configuration, then run:

```text
pnpm test:adblock
pnpm test:adblock:electron
pnpm package
pnpm test:adblock:packaged
pnpm typecheck
```

The Electron check uses an isolated nonpersistent session and a local HTTP server.
It verifies blocked ad requests, allowed content, toggling, a corrupt cache, and
shutdown during an update. Its result is also written to
`.verification/adblock-result.json`.

The packaged-runtime check resolves the blocker and its cosmetic preload from
inside `app.asar` and verifies ad blocking with those packaged dependencies.
Pass an alternative archive path as its first argument on other platforms.
Forge's Vite plugin excludes `node_modules`, so the packaging hook explicitly
copies the external blocker and its dependency tree, including license files.

The Windows package, playback checks, Electron session checks, and packaged-runtime
check passed after fixing the initially missing packaged dependency. The rebuilt
Windows executable also opened successfully and loaded the music view. Type checking reports eight existing errors in the companion-server and
Last.fm integrations, reproduced against the unchanged base commit.

Before releasing, check signed-out and signed-in playback, Google sign-in,
playlist transitions, pause/resume, app restart, and toggling the setting.
The original GPL-3.0-only license remains; Ghostery's dependency includes its own
MPL-2.0 license and notices. Filter data remains subject to its upstream licenses.
