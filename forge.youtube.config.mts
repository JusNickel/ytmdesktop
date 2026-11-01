import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import base from './forge.music.config.mts';
import { copyRuntimeDependencies } from './scripts/copy-runtime-dependencies.mjs';

const config: ForgeConfig = {
  ...base,
  packagerConfig: {
    ...base.packagerConfig,
    name: 'YouTube Desktop AdBlock',
    executableName: 'youtube-desktop-adblock',
    appBundleId: 'dev.jusnickel.youtube-desktop-adblock',
    protocols: [],
    appCategoryType: 'public.app-category.video',
  },
  makers: [
    new MakerSquirrel({
      name: 'youtube_desktop_adblock',
      title: 'YouTube Desktop AdBlock',
      setupExe: 'YouTube-Desktop-AdBlock-Setup.exe',
      description:
        'An unofficial YouTube video desktop player with ad blocking',
      setupIcon: 'src/assets/icons/ytmd.ico',
    }),
    new MakerRpm({
      options: {
        name: 'youtube-desktop-adblock',
        revision: '1',
        compressionLevel: 1,
        productDescription:
          'An unofficial desktop player for regular YouTube videos with ad blocking',
        bin: 'youtube-desktop-adblock',
        productName: 'YouTube Desktop AdBlock',
        description:
          'An unofficial desktop player for regular YouTube videos with ad blocking',
        categories: ['AudioVideo', 'Video'],
        icon: 'src/assets/icons/ytmd.png',
      },
    }),
    new MakerZIP({}, ['linux']),
  ],
  publishers: [],
  plugins: [
    ...(base.plugins ?? []).filter((plugin) => !(plugin instanceof VitePlugin)),
    new VitePlugin({
      build: [
        {
          entry: 'src/youtube/index.ts',
          config: 'config/vite/main.ts',
          target: 'main',
        },
        {
          entry: 'src/youtube/shell-preload.ts',
          config: 'config/vite/preload/youtube-shell.ts',
          target: 'preload',
        },
        {
          entry: 'src/youtube/preload.ts',
          config: 'config/vite/preload/youtube.ts',
          target: 'preload',
        },
      ],
      renderer: [
        { name: 'youtube_shell', config: 'config/vite/youtube-shell.ts' },
      ],
    }),
  ],
  hooks: {
    async packageAfterCopy(_config, buildPath) {
      await copyRuntimeDependencies(
        '@ghostery/adblocker-electron',
        __dirname,
        buildPath,
      );
    },
  },
};
export default config;
