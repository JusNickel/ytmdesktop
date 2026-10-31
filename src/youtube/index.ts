import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
  WebContentsView,
  type IpcMainEvent,
} from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SHELL_URL, registerShellProtocol } from './shell-protocol';
import electronSquirrelStartup from 'electron-squirrel-startup';
import { MusicAdBlocker } from '../main/services/ytmviewmanager/adblocker';
import { isAllowedNavigation, isYouTubePage } from './navigation';
import {
  defaultSettings,
  emptyPlayback,
  parseSettings,
  parsePlayback,
  type Settings,
} from './state';
import { VideoPresence } from './presence';
import { FirstVideoNavigation } from './first-video';

declare const YOUTUBE_SHELL_VITE_DEV_SERVER_URL: string;
app.setName('YouTube Desktop AdBlock');
app.setPath(
  'userData',
  path.join(app.getPath('appData'), 'youtube-desktop-adblock'),
);
app.enableSandbox();
if (process.platform === 'win32')
  app.setAppUserModelId(
    'com.squirrel.youtube_desktop_adblock.youtube-desktop-adblock',
  );
let main: BrowserWindow | undefined;
let mini: BrowserWindow | undefined;
let view: WebContentsView;
let blocker: MusicAdBlocker | undefined;
let presence: VideoPresence | undefined;
let settings = { ...defaultSettings };
let playback = { ...emptyPlayback };
let settingsOpen = false;
let htmlFullscreen = false;
let quitting = false;
let settingsPath: string;
const shellFile = path.join(__dirname, '../renderer/youtube/index.html');
const shellURL = () =>
  app.isPackaged || typeof YOUTUBE_SHELL_VITE_DEV_SERVER_URL === 'undefined'
    ? SHELL_URL
    : new URL(YOUTUBE_SHELL_VITE_DEV_SERVER_URL).href;
const activeWindow = () => (mini && !mini.isDestroyed() ? mini : main);

if (electronSquirrelStartup) {
  /* Squirrel handles shortcut creation/removal and exits. */
} else if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const target = activeWindow();
    target?.restore();
    target?.show();
    target?.focus();
  });
  app
    .whenReady()
    .then(createApp)
    .catch((error) => {
      console.error('YouTube Desktop startup failed', error);
      dialog.showErrorBox('YouTube Desktop could not start', String(error));
      app.quit();
    });
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  quitting = true;
  blocker?.stop();
  presence?.stop();
  if (view && !view.webContents.isDestroyed()) view.webContents.close();
});

function broadcast() {
  for (const target of [main, mini])
    if (target && !target.isDestroyed())
      target.webContents.send('shell:state', {
        settings,
        playback,
        discord: presence?.status ?? 'Off',
        mini: !!mini,
      });
}
function layout() {
  const target = activeWindow();
  if (!target || !view) return;
  const [width, height] = target.getContentSize();
  const top = htmlFullscreen ? 0 : mini ? 32 : 56;
  const bottom = htmlFullscreen ? 0 : mini ? 72 : 110;
  view.setBounds({
    x: 0,
    y: top,
    width,
    height: Math.max(0, height - top - bottom),
  });
  view.setVisible(!settingsOpen);
}
function isShell(event: IpcMainEvent) {
  return [main, mini].some(
    (target) =>
      target &&
      !target.isDestroyed() &&
      event.sender === target.webContents &&
      event.senderFrame === target.webContents.mainFrame &&
      target.webContents.getURL().split('?')[0] === shellURL().split('?')[0],
  );
}
function isVideo(event: IpcMainEvent) {
  return (
    view &&
    event.sender === view.webContents &&
    event.senderFrame === view.webContents.mainFrame &&
    isYouTubePage(view.webContents.getURL())
  );
}
function sendVideoSettings() {
  view.webContents.send('youtube:adblock', settings.adblock);
  view.webContents.send('youtube:mini', !!mini);
}
function saveSetting(key: keyof Settings, value: boolean) {
  settings[key] = value;
  writeFileSync(settingsPath, JSON.stringify(settings));
  if (key === 'adblock') {
    blocker?.setEnabled(value);
    sendVideoSettings();
  }
  if (key === 'discord') presence?.setEnabled(value);
  if (key === 'alwaysOnTop') main?.setAlwaysOnTop(value);
  broadcast();
}
function closeSettings() {
  settingsOpen = false;
  layout();
  main?.webContents.send('shell:settings', false);
}
function restoreMain() {
  if (!mini || !main || main.isDestroyed()) return;
  const previousMini = mini;
  mini = undefined;
  previousMini.contentView.removeChildView(view);
  main.contentView.addChildView(view);
  main.show();
  main.focus();
  layout();
  sendVideoSettings();
  broadcast();
  previousMini.destroy();
}
async function toggleMini() {
  if (mini) {
    restoreMain();
    return;
  }
  if (!main || main.isDestroyed()) return;
  closeSettings();
  if (main.isFullScreen()) main.setFullScreen(false);
  mini = createShell(true);
  main.contentView.removeChildView(view);
  mini.contentView.addChildView(view);
  main.hide();
  layout();
  sendVideoSettings();
  await loadShell(mini, true);
  mini?.show();
  broadcast();
}
function createShell(isMini: boolean) {
  const target = new BrowserWindow({
    title: isMini ? 'YouTube mini player' : 'YouTube Desktop',
    width: isMini ? 480 : 1280,
    height: isMini ? 374 : 800,
    minWidth: isMini ? 320 : 720,
    minHeight: isMini ? 240 : 500,
    frame: false,
    show: false,
    backgroundColor: '#131416',
    alwaysOnTop: isMini || settings.alwaysOnTop,
    icon: path.join(process.resourcesPath, 'ytmd.png'),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../youtube-shell/shell-preload.cjs'),
    },
  });
  target.on('resize', layout);
  target.on('enter-full-screen', layout);
  target.on('leave-full-screen', layout);
  target.on('close', (event) => {
    if (isMini && !quitting) {
      event.preventDefault();
      restoreMain();
    } else if (!isMini && !quitting) app.quit();
  });
  target.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  target.webContents.on('will-navigate', (event) => event.preventDefault());
  target.webContents.on('before-input-event', (event, input) => {
    if (shortcut(input)) event.preventDefault();
  });
  return target;
}
async function loadShell(target: BrowserWindow, isMini: boolean) {
  const url = shellURL();
  await target.loadURL(
    isMini ? `${url}${url.includes('?') ? '&' : '?'}mini=1` : url,
  );
}
function shortcut(input: Electron.Input) {
  if (input.type !== 'keyDown') return false;
  if (input.control && input.key.toLowerCase() === 'm') {
    void toggleMini();
    return true;
  }
  if (input.control && input.shift && input.key.toLowerCase() === 't') {
    saveSetting('alwaysOnTop', !settings.alwaysOnTop);
    return true;
  }
  if (input.control && input.key === ',') {
    if (mini) restoreMain();
    settingsOpen = true;
    layout();
    main?.webContents.send('shell:settings', true);
    return true;
  }
  if (input.alt && input.key === 'ArrowLeft') {
    if (view.webContents.navigationHistory.canGoBack())
      view.webContents.navigationHistory.goBack();
    return true;
  }
  if (input.key === 'Escape' && settingsOpen) {
    closeSettings();
    return true;
  }
  return false;
}
async function createApp() {
  registerShellProtocol(path.dirname(shellFile));
  const profile = app.getPath('userData');
  mkdirSync(profile, { recursive: true });
  settingsPath = path.join(profile, 'settings.json');
  try {
    settings = parseSettings(JSON.parse(readFileSync(settingsPath, 'utf8')));
  } catch {
    /* First launch. */
  }
  const browserSession = session.fromPartition('persist:youtube-video');
  browserSession.setPermissionRequestHandler(
    (_contents, permission, callback) => callback(permission === 'fullscreen'),
  );
  browserSession.setPermissionCheckHandler(
    (_contents, permission) => permission === 'fullscreen',
  );
  blocker = new MusicAdBlocker(
    browserSession,
    path.join(profile, 'adblock-engine.bin'),
  );
  blocker.setEnabled(settings.adblock);
  presence = new VideoPresence(broadcast);
  presence.setEnabled(settings.discord);
  main = createShell(false);
  view = new WebContentsView({
    webPreferences: {
      session: browserSession,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../youtube/preload.cjs'),
    },
  });
  main.contentView.addChildView(view);
  const contents = view.webContents;
  const firstVideo = new FirstVideoNavigation();
  contents.on('did-navigate', (_event, url) => {
    firstVideo.observe(url, false);
  });
  contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame && firstVideo.observe(url, true)) {
      setImmediate(() => {
        if (!contents.isDestroyed() && contents.getURL() === url)
          contents.reloadIgnoringCache();
      });
    }
  });

  const load = (url: string) => {
    void contents.loadURL(url).catch(() => {});
  };
  const openExternal = (value: string) => {
    try {
      if (new URL(value).protocol === 'https:') void shell.openExternal(value);
    } catch {
      /* Invalid link. */
    }
  };
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });
  contents.on('will-redirect', (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) load(url);
    else openExternal(url);
    return { action: 'deny' };
  });
  contents.on('before-input-event', (event, input) => {
    if (shortcut(input)) event.preventDefault();
  });
  contents.on('enter-html-full-screen', () => {
    htmlFullscreen = true;
    activeWindow()?.setFullScreen(true);
    layout();
  });
  contents.on('leave-html-full-screen', () => {
    htmlFullscreen = false;
    activeWindow()?.setFullScreen(false);
    layout();
  });
  contents.on(
    'did-start-navigation',
    (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) {
        playback = { ...emptyPlayback };
        presence?.setPlayback(playback);
        broadcast();
      }
    },
  );
  contents.on(
    'did-fail-load',
    (_event, code, description, _url, isMainFrame) => {
      const target = activeWindow();
      if (!isMainFrame || code === -3 || !target || target.isDestroyed())
        return;
      void dialog.showMessageBox(target, {
        type: 'error',
        message: 'YouTube could not load. Use the reload button to try again.',
        detail: `${description} (${code})`,
      });
    },
  );
  ipcMain.on('youtube:ready', (event) => {
    if (isVideo(event)) sendVideoSettings();
  });
  ipcMain.on('youtube:state', (event, value: unknown) => {
    if (!isVideo(event)) return;
    const state = parsePlayback(value);
    if (!state) return;
    playback = state;
    presence?.setPlayback(playback);
    broadcast();
  });
  ipcMain.on('shell:ready', (event) => {
    if (isShell(event)) broadcast();
  });
  ipcMain.on('shell:command', (event, command: unknown, value: unknown) => {
    if (!isShell(event) || typeof command !== 'string') return;
    const target = activeWindow();
    if (!target) return;
    if (['play', 'previous', 'next', 'mute'].includes(command))
      contents.send('youtube:control', command);
    else if (
      ['seek', 'volume'].includes(command) &&
      typeof value === 'number' &&
      Number.isFinite(value)
    )
      contents.send(
        'youtube:control',
        command,
        Math.max(
          0,
          Math.min(command === 'volume' ? 1 : playback.duration, value),
        ),
      );
    else if (command === 'home') load('https://www.youtube.com/');
    else if (command === 'back' && contents.navigationHistory.canGoBack())
      contents.navigationHistory.goBack();
    else if (command === 'forward' && contents.navigationHistory.canGoForward())
      contents.navigationHistory.goForward();
    else if (command === 'reload') contents.reload();
    else if (command === 'mini') void toggleMini();
    else if (command === 'minimize') target.minimize();
    else if (command === 'maximize') {
      if (target.isMaximized()) target.unmaximize();
      else target.maximize();
    } else if (command === 'close') {
      if (mini) restoreMain();
      else app.quit();
    } else if (command === 'settings' && typeof value === 'boolean') {
      settingsOpen = value;
      layout();
    } else if (command === 'setting' && value && typeof value === 'object') {
      const update = value as { key?: unknown; value?: unknown };
      if (
        typeof update.key === 'string' &&
        ['adblock', 'discord', 'alwaysOnTop'].includes(update.key) &&
        typeof update.value === 'boolean'
      )
        saveSetting(update.key as keyof Settings, update.value);
    }
  });
  Menu.setApplicationMenu(null);
  await loadShell(main, false);
  layout();
  main.show();
  load('https://www.youtube.com/');
}
