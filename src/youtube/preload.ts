import { ipcRenderer } from 'electron';
import {
  skipPlaybackAd,
  isPlaybackAd,
} from '../renderer/ytmview/skip-playback-ad';

// Remote YouTube content receives no Node/Electron bridge.
if (
  location.protocol === 'https:' &&
  ['www.youtube.com', 'youtube.com'].includes(location.hostname) &&
  window.top === window
) {
  let enabled = false;
  let mini = false;
  ipcRenderer.on('youtube:adblock', (_event, value: boolean) => {
    enabled = value === true;
  });
  const updateMiniStyle = () => {
    let style = document.getElementById('ytmd-mini-style');
    if (mini && !style) {
      style = document.createElement('style');
      style.id = 'ytmd-mini-style';
      style.textContent =
        'html,body{overflow:hidden!important} #movie_player{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;background:#000!important} #movie_player video{width:100%!important;height:100%!important;left:0!important;top:0!important;object-fit:contain!important}';
      document.documentElement.append(style);
    } else if (!mini) style?.remove();
  };
  ipcRenderer.on('youtube:mini', (_event, value: boolean) => {
    mini = value === true;
    updateMiniStyle();
  });
  ipcRenderer.on(
    'youtube:control',
    (_event, command: string, value: number) => {
      const video = document.querySelector<HTMLVideoElement>(
        '#movie_player video, video',
      );
      if (!video) return;
      if (command === 'play') {
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
      } else if (command === 'mute') video.muted = !video.muted;
      else if (
        command === 'seek' &&
        Number.isFinite(value) &&
        Number.isFinite(video.duration)
      )
        video.currentTime = Math.max(0, Math.min(value, video.duration));
      else if (command === 'volume' && Number.isFinite(value))
        video.volume = Math.max(0, Math.min(1, value));
      else if (command === 'next')
        document.querySelector<HTMLButtonElement>('.ytp-next-button')?.click();
      else if (command === 'previous')
        document.querySelector<HTMLButtonElement>('.ytp-prev-button')?.click();
    },
  );
  ipcRenderer.send('youtube:ready');
  const timer = setInterval(() => {
    if (enabled) skipPlaybackAd(document);
    updateMiniStyle();
    const video = document.querySelector<HTMLVideoElement>(
      '#movie_player video, video',
    );
    ipcRenderer.send('youtube:state', {
      title:
        document
          .querySelector(
            'ytd-watch-metadata h1, #title h1, h1.ytd-watch-metadata',
          )
          ?.textContent?.trim() || document.title.replace(/ - YouTube$/, ''),
      author:
        document
          .querySelector(
            'ytd-video-owner-renderer #channel-name, ytd-channel-name #text',
          )
          ?.textContent?.trim() || '',
      url: location.href,
      time: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
      paused: video?.paused ?? true,
      available: !!video && !isPlaybackAd(document),
    });
  }, 500);
  addEventListener('unload', () => clearInterval(timer), { once: true });
}
