# YouTube Music Desktop — Built-in AdBlock

An unofficial YouTube Music desktop app with **ad blocking built in and enabled by default**. No browser extension is required.

This is [JusNickel's fork](https://github.com/JusNickel/ytmdesktop) of [YTMDesktop](https://github.com/ytmdesktop/ytmdesktop). The original desktop features, including Discord Rich Presence, remain available.

![YouTube Music Desktop App](.github/images/readme_main_app.png)

## Download for Windows

**[Download the Windows x64 installer](https://github.com/JusNickel/ytmdesktop/releases/latest/download/YouTube-Music-AdBlock-Setup.exe)** · [All releases and checksums](https://github.com/JusNickel/ytmdesktop/releases)

1. Close YouTube Music Desktop completely, including its tray icon.
2. Run **YouTube-Music-AdBlock-Setup.exe**.
3. Open YouTube Music Desktop and play music. Ad blocking starts enabled.

The installer updates the existing YouTube Music Desktop App and preserves its profile. It is currently unsigned. A SHA-256 checksum is included with each Windows release.

Windows x64 is the currently tested installer platform. Linux and macOS users can build from source; binaries for those platforms are not included in this fork's Windows release. Winget, Scoop, Homebrew, and upstream download links install the original project rather than this ad-blocking fork.

## Built-in ad blocking

- **Network filtering:** the Ghostery Electron engine filters advertising requests in the music browser session.
- **Playback ad skipping:** a helper skips ads explicitly identified by YouTube's player, without changing ordinary song playback speed or volume.
- **Cached filters:** filters are stored locally, with a small offline fallback and background refresh.
- **Your choice:** turn **Settings → Playback → Block ads** on or off. Reload the music page after changing it.

YouTube changes can affect blocking, so removal of every advertisement is not guaranteed. See [ADBLOCK.md](ADBLOCK.md) for behavior, verification, and limitations.

## Build from source

Use Node.js 24 or newer and the pnpm version specified in `package.json`.

```sh
git clone https://github.com/JusNickel/ytmdesktop.git
cd ytmdesktop
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

To build an installer for your platform:

```sh
pnpm make
```

The Windows installer is generated at `out/make/squirrel.windows/x64/YouTube-Music-AdBlock-Setup.exe`. On Windows, the project's approved dependency build scripts initialize Electron and the installer's compression tool during `pnpm install`.

On Linux, packaging requires `fakeroot` and `dpkg` for Debian packages, or `rpm-build` for RPM packages. Platform builds other than Windows x64 have not been validated for this fork.

## Verify the ad blocker

```sh
pnpm test:adblock
pnpm test:adblock:electron
pnpm package
pnpm test:adblock:packaged
```

The packaged check defaults to the Windows x64 output path. Pass an alternative `app.asar` path as an argument for another platform. Existing upstream type-check issues are documented in [ADBLOCK.md](ADBLOCK.md).

## License and attribution

This fork retains the original project's GPL-3.0-only license. See [LICENSE](LICENSE). The Ghostery dependency includes its own MPL-2.0 license and notices; filter data is subject to its upstream licenses. YouTube and YouTube Music belong to their respective owners; this project is not affiliated with Google or YouTube.

## Contributors

A Thank you to all the contributors throughout the project, without their work this project would have just been a small project and never expanded to where it is now.

[<img alt="adlerluiz" src="https://avatars.githubusercontent.com/u/2112638?v=4&s=240" width="120" height="120">](https://github.com/adlerluiz)
[<img alt="NovusTheory" src="https://avatars.githubusercontent.com/u/3434404?v=4&s=240" width="120" height="120">](https://github.com/NovusTheory)
[<img alt="mingjun97" src="https://avatars.githubusercontent.com/u/15214491?v=4&s=240" width="120" height="120">](https://github.com/mingjun97)
[<img alt="rickpalmeira" src="https://avatars.githubusercontent.com/u/4140033?v=4&s=240" width="120" height="120">](https://github.com/rickpalmeira)
[<img alt="Alipoodle" src="https://avatars.githubusercontent.com/u/17199186?v=4&s=240" width="120" height="120">](https://github.com/Alipoodle)
[<img alt="flleeppyy" src="https://avatars.githubusercontent.com/u/18307183?v=4&s=240" width="120" height="120">](https://github.com/flleeppyy)
[<img alt="zagoruev" src="https://avatars.githubusercontent.com/u/986243?v=4&s=240" width="120" height="120">](https://github.com/zagoruev)
[<img alt="Venipa" src="https://avatars.githubusercontent.com/u/17952364?v=4&s=240" width="120" height="120">](https://github.com/Venipa)
[<img alt="serjan-nasredin" src="https://avatars.githubusercontent.com/u/67647968?v=4&s=240" width="120" height="120">](https://github.com/serjan-nasredin)
[<img alt="TotalChris" src="https://avatars.githubusercontent.com/u/41809916?v=4&s=240" width="120" height="120">](https://github.com/TotalChris)
[<img alt="ArnyminerZ" src="https://avatars.githubusercontent.com/u/12086466?v=4&s=240" width="120" height="120">](https://github.com/ArnyminerZ)
[<img alt="TotallyNotInUse" src="https://avatars.githubusercontent.com/u/56458705?v=4&s=240" width="120" height="120">](https://github.com/TotallyNotInUse)
[<img alt="ddarkr" src="https://avatars.githubusercontent.com/u/6638675?v=4&s=240" width="120" height="120">](https://github.com/ddarkr)
[<img alt="pinkiesky" src="https://avatars.githubusercontent.com/u/7098424?v=4&s=240" width="120" height="120">](https://github.com/pinkiesky)
[<img alt="NNowakowski" src="https://avatars.githubusercontent.com/u/16933892?v=4&s=240" width="120" height="120">](https://github.com/NNowakowski)
[<img alt="dm3ch" src="https://avatars.githubusercontent.com/u/5025313?v=4&s=240" width="120" height="120">](https://github.com/dm3ch)
[<img alt="Vistaus" src="https://avatars.githubusercontent.com/u/1716229?v=4&s=240" width="120" height="120">](https://github.com/Vistaus)
[<img alt="smarquespt" src="https://avatars.githubusercontent.com/u/1302668?v=4&s=240" width="120" height="120">](https://github.com/smarquespt)
[<img alt="peter9811" src="https://avatars.githubusercontent.com/u/22783445?v=4&s=240" width="120" height="120">](https://github.com/peter9811)
[<img alt="KageRyo" src="https://avatars.githubusercontent.com/u/36478298?v=4&s=240" width="120" height="120">](https://github.com/KageRyo)
[<img alt="andrew000" src="https://avatars.githubusercontent.com/u/11490628?v=4&s=240" width="120" height="120">](https://github.com/andrew000)
[<img alt="danparidae" src="https://avatars.githubusercontent.com/u/7272087?v=4&s=240" width="120" height="120">](https://github.com/danparidae)
[<img alt="tbvjaos510" src="https://avatars.githubusercontent.com/u/32216112?v=4&s=240" width="120" height="120">](https://github.com/tbvjaos510)
[<img alt="andia89" src="https://avatars.githubusercontent.com/u/6475757?v=4&s=240" width="120" height="120">](https://github.com/andia89)
[<img alt="nils-kt" src="https://avatars.githubusercontent.com/u/34674720?v=4&s=240" width="120" height="120">](https://github.com/nils-kt)
[<img alt="Nerogar" src="https://avatars.githubusercontent.com/u/3390934?v=4&s=240" width="120" height="120">](https://github.com/Nerogar)
[<img alt="nattadasu" src="https://avatars.githubusercontent.com/u/49780229?v=4&s=240" width="120" height="120">](https://github.com/nattadasu)
[<img alt="mkotb" src="https://avatars.githubusercontent.com/u/6364146?v=4&s=240" width="120" height="120">](https://github.com/mkotb)
[<img alt="chaoky" src="https://avatars.githubusercontent.com/u/9826702?v=4&s=240" width="120" height="120">](https://github.com/chaoky)
[<img alt="ElectricalBoy" src="https://avatars.githubusercontent.com/u/15651807?v=4&s=240" width="120" height="120">](https://github.com/ElectricalBoy)
