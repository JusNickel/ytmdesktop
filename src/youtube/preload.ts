import { ipcRenderer, webFrame } from 'electron';
import { playbackTarget } from './playback-target';
import { ShortsWheelNavigator } from './shorts-wheel';
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
  let lastShort = '';
  let miniPlayer: HTMLElement | null = null;
  const shortsWheel = new ShortsWheelNavigator();
  const navigateShort = (direction: number) => {
    const selector =
      direction > 0
        ? '#navigation-button-down button, button[aria-label="Next video"]'
        : '#navigation-button-up button, button[aria-label="Previous video"]';
    // The feed's navigation handlers live in the main world. Use a fixed,
    // narrowly scoped action and catch navigation-time execution failures.
    void webFrame
      .executeJavaScript(
        `(() => {
      const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(button => !button.disabled && button.getClientRects().length && button.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}));
      button?.click();
    })()`,
        true,
      )
      .catch((error) =>
        console.warn('Shorts navigation was interrupted', error),
      );
  };
  window.addEventListener(
    'wheel',
    (event) => {
      if (
        !location.pathname.startsWith('/shorts/') ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target?.closest('ytd-shorts, ytd-reel-video-renderer, #shorts-player')
      )
        return;
      if (
        target.closest(
          'input, textarea, [contenteditable="true"], [role="dialog"], ytd-engagement-panel-section-list-renderer, yt-engagement-panel-section-list-renderer, #comments',
        )
      )
        return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const direction = shortsWheel.step(
        event.deltaX,
        event.deltaY,
        event.deltaMode,
        Date.now(),
      );
      if (direction) navigateShort(direction);
    },
    { capture: true, passive: false },
  );

  ipcRenderer.on('youtube:adblock', (_event, value: boolean) => {
    enabled = value === true;
  });
  const updateMiniStyle = () => {
    const active = mini ? playbackTarget(document).player : null;
    if (active !== miniPlayer) {
      miniPlayer?.removeAttribute('data-ytmd-active-player');
      miniPlayer = active;
      miniPlayer?.setAttribute('data-ytmd-active-player', '');
    }
    let style = document.getElementById('ytmd-mini-style');
    if (mini && !style) {
      style = document.createElement('style');
      style.id = 'ytmd-mini-style';
      style.textContent =
        'html,body{overflow:hidden!important} [data-ytmd-active-player]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;background:#000!important} [data-ytmd-active-player] video{width:100%!important;height:100%!important;left:0!important;top:0!important;object-fit:contain!important}';
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
      const { video, shorts } = playbackTarget(document);
      if (shorts && (command === 'next' || command === 'previous')) {
        document
          .querySelector<HTMLButtonElement>(
            command === 'next'
              ? '#navigation-button-down button, button[aria-label="Next video"]'
              : '#navigation-button-up button, button[aria-label="Previous video"]',
          )
          ?.click();
        return;
      }
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
    const { video, player, shorts } = playbackTarget(document);
    if (shorts && video && location.pathname !== lastShort) {
      for (const other of document.querySelectorAll<HTMLVideoElement>('video'))
        if (other !== video && !other.paused) other.pause();
      lastShort = location.pathname;
    } else if (!shorts) lastShort = '';
    if (enabled) skipPlaybackAd(document, player);
    updateMiniStyle();
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
      available: !!video && !isPlaybackAd(document, player),
    });
  }, 500);
  addEventListener('unload', () => clearInterval(timer), { once: true });
}
