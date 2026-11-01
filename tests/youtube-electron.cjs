// Exercises the packaged local shell + sandboxed remote view, using only fixtures.
const {
  app,
  BrowserWindow,
  session,
  dialog,
  ipcMain,
  webContents,
} = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const root = path.resolve('.verification/youtube-desktop-smoke');
fs.mkdirSync(root, { recursive: true });
app.setPath('appData', root);
// Short socket path (Unix socket addresses have a strict length limit).
const runtime = fs.mkdtempSync('/tmp/ytmd-rpc-');
const originalRuntime = process.env.XDG_RUNTIME_DIR;
if (
  originalRuntime &&
  process.env.WAYLAND_DISPLAY &&
  !path.isAbsolute(process.env.WAYLAND_DISPLAY)
) {
  fs.symlinkSync(
    path.join(originalRuntime, process.env.WAYLAND_DISPLAY),
    path.join(runtime, process.env.WAYLAND_DISPLAY),
  );
}
process.env.XDG_RUNTIME_DIR = runtime;
fs.mkdirSync(path.join(root, 'youtube-desktop-adblock'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'youtube-desktop-adblock/settings.json'),
  JSON.stringify({ adblock: true, discord: false }),
);
const archive = path.resolve(
  process.argv[2] || 'out/YouTube Desktop AdBlock-linux-x64/resources/app.asar',
);
const errors = [];
const dialogs = [];
const rpc = [];
const rpcOps = [];
const flatpak = path.join(runtime, '.flatpak/dev.vencord.Vesktop/xdg-run');
fs.mkdirSync(flatpak, { recursive: true });
let connection;
const server = net.createServer((socket) => {
  connection = socket;
  let pending = Buffer.alloc(0);
  socket.on('data', (data) => {
    pending = Buffer.concat([pending, data]);
    while (pending.length >= 8) {
      const length = pending.readInt32LE(4);
      if (pending.length < length + 8) break;
      rpcOps.push(pending.readInt32LE(0));
      rpc.push(JSON.parse(pending.toString('utf8', 8, 8 + length)));
      pending = pending.subarray(length + 8);
    }
  });
});
server.listen(path.join(flatpak, 'discord-ipc-0'));
dialog.showMessageBox = async (...args) => {
  dialogs.push(args);
  return { response: 0, checkboxChecked: false };
};
const timeout = setTimeout(
  () => finish(new Error('Desktop smoke test timed out')),
  45000,
);
function finish(error) {
  clearTimeout(timeout);
  connection?.destroy();
  server.close();
  fs.rmSync(runtime, { recursive: true, force: true });
  if (error) console.error(error);
  else
    console.log(
      'PASS: overlay, settings, playback IPC, mini-player reparenting, Discord RPC, navigation errors and sandbox',
    );
  app.exit(error ? 1 : 0);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate, label) {
  for (let i = 0; i < 100; i++) {
    if (await predicate()) return;
    await sleep(50);
  }
  throw new Error(`Timed out: ${label}`);
}
app.on('web-contents-created', (_event, contents) => {
  contents.on('preload-error', (_event, preloadPath, error) =>
    errors.push(`${preloadPath}: ${error}`),
  );
});
app.whenReady().then(() => {
  session
    .fromPartition('persist:youtube-video')
    .protocol.handle('https', (request) => {
      if (
        request.url !== 'https://www.youtube.com/' &&
        request.url !== 'https://www.youtube.com/watch?v=fixture123' &&
        request.url !== 'https://www.youtube.com/shorts/shortA'
      )
        return new Response('', { status: 404 });
      return new Response(
        `<!doctype html><title>Fixture video - YouTube</title><style>body{background:#222;color:white}#movie_player{height:200px}</style><div id="movie_player"><button class="ytp-skip-ad-button" onclick="document.documentElement.dataset.skipped='yes'">Skip ad</button><video></video></div>`,
        { headers: { 'content-type': 'text/html' } },
      );
    });
});
require(path.join(archive, '.vite/main/index.cjs'));
app
  .whenReady()
  .then(async () => {
    await until(
      () =>
        webContents
          .getAllWebContents()
          .some((c) => c.getURL() === 'https://www.youtube.com/'),
      'remote view',
    );
    const video = webContents
      .getAllWebContents()
      .find((c) => c.getURL() === 'https://www.youtube.com/');
    const main = BrowserWindow.getAllWindows()[0];
    await until(
      () => main.webContents.getURL().includes('index.html'),
      'local shell',
    );
    await until(
      () =>
        video.executeJavaScript(
          'document.documentElement.dataset.skipped === "yes"',
        ),
      'ad skipper',
    );
    assert.equal(await video.executeJavaScript('typeof require'), 'undefined');
    assert.equal(
      await video.executeJavaScript('typeof window.desktop'),
      'undefined',
    );
    assert.equal(video.getLastWebPreferences().sandbox, true);
    assert.equal(
      await main.webContents.executeJavaScript('!!window.desktop'),
      true,
    );
    ipcMain.emit(
      'shell:command',
      { sender: video, senderFrame: video.mainFrame },
      'setting',
      { key: 'discord', value: true },
    );
    await sleep(50);
    assert.equal(rpc.length, 0, 'remote page cannot enable sharing');
    await main.webContents.executeJavaScript(
      'document.querySelector("[data-command=mute]").click()',
    );
    await until(
      () => video.executeJavaScript('document.querySelector("video").muted'),
      'mute playback control',
    );
    await main.webContents.executeJavaScript(
      'document.getElementById("settings-button").click()',
    );
    await until(
      () =>
        main.webContents.executeJavaScript(
          '!document.getElementById("settings").hidden',
        ),
      'settings panel',
    );
    assert.equal(main.contentView.children[0].getVisible(), false);
    // Toggle real settings via the local UI, not a privileged test-only bridge.
    await main.webContents.executeJavaScript(
      'document.getElementById("alwaysOnTop").click()',
    );
    await until(() => main.isAlwaysOnTop(), 'always on top setting');
    await main.webContents.executeJavaScript(
      'document.getElementById("discord").click()',
    );
    await until(
      () => rpc.some((message) => message.client_id),
      'Discord handshake',
    );
    const playing = {
      title: 'Fixture video',
      author: 'Fixture channel',
      url: 'https://www.youtube.com/watch?v=fixture123',
      time: 10,
      duration: 120,
      paused: false,
      available: true,
    };
    const sendState = (state) =>
      ipcMain.emit(
        'youtube:state',
        { sender: video, senderFrame: video.mainFrame },
        state,
      );
    sendState(playing);
    await until(
      () =>
        rpc.some(
          (message) => message.args?.activity?.details === 'Fixture video',
        ),
      'Discord activity',
    );
    const activity = rpc.find(
      (message) => message.args?.activity?.details === 'Fixture video',
    ).args.activity;
    assert.equal(activity.type, 3);
    // Discord heartbeats must survive fragmented socket frames.
    const pingPayload = Buffer.from(JSON.stringify({ heartbeat: 'fixture' }));
    const pingFrame = Buffer.alloc(8 + pingPayload.length);
    pingFrame.writeInt32LE(3, 0);
    pingFrame.writeInt32LE(pingPayload.length, 4);
    pingPayload.copy(pingFrame, 8);
    connection.write(pingFrame.subarray(0, 5));
    await sleep(20);
    connection.write(pingFrame.subarray(5));
    await until(() => rpcOps.includes(4), 'Discord heartbeat PONG');

    assert.equal(activity.state, 'Fixture channel');
    assert.equal(activity.buttons[0].url, playing.url);
    sendState({ ...playing, paused: true });
    await until(
      () =>
        rpc.some(
          (message) => message.cmd === 'SET_ACTIVITY' && !message.args.activity,
        ),
      'paused presence cleared',
    );
    await main.webContents.executeJavaScript(
      'document.getElementById("discord").click()',
    );
    const persisted = JSON.parse(
      fs.readFileSync(path.join(root, 'youtube-desktop-adblock/settings.json')),
    );
    assert.equal(persisted.discord, false);
    assert.equal(persisted.alwaysOnTop, true);
    await main.webContents.executeJavaScript(
      'document.getElementById("settings-close").click()',
    );
    await until(
      () => main.contentView.children[0].getVisible(),
      'video restored after settings',
    );
    let documentLoads = 0;
    video.on('did-finish-load', () => {
      documentLoads++;
    });
    await video.executeJavaScript(
      "history.pushState({}, '', '/shorts/shortA')",
    );

    await video.executeJavaScript(`
      const old = document.querySelector('video'); old.id='old-reel'; old.muted=false; old.style.cssText='position:fixed;top:-600px;width:100px;height:100px';
      const active = document.createElement('div'); active.id='shorts-player'; active.className='html5-video-player';
      active.innerHTML='<video id="active-reel" style="position:fixed;top:20px;left:20px;width:100px;height:100px"></video>';
      const surface=document.createElement('ytd-shorts'); surface.append(active);
      const next=document.createElement('button');next.ariaLabel='Next video';next.id='fixture-next-short';
      next.onclick=()=>{document.documentElement.dataset.shortSteps=String(Number(document.documentElement.dataset.shortSteps||0)+1);};surface.append(next);
      const comments=document.createElement('div');comments.id='comments';surface.append(comments);
      document.body.append(surface);
    `);
    await sleep(600);
    assert.equal(
      documentLoads,
      0,
      'entering Shorts preserves its feed document',
    );
    await main.webContents.executeJavaScript(
      'document.querySelector("[data-command=mute]").click()',
    );
    await until(
      () =>
        video.executeJavaScript('document.getElementById("active-reel").muted'),
      'controls follow the visible Shorts player',
    );
    assert.equal(
      await video.executeJavaScript(
        'document.getElementById("old-reel").muted',
      ),
      false,
    );
    await video.executeJavaScript(
      "history.pushState({}, '', '/shorts/shortB')",
    );
    await sleep(300);
    assert.equal(documentLoads, 0, 'scrolling Shorts must not reload the feed');
    const wheelHandled = await video.executeJavaScript(
      `(()=>{const event=new WheelEvent('wheel',{deltaY:650,bubbles:true,cancelable:true});document.getElementById('active-reel').dispatchEvent(event);return event.defaultPrevented;})()`,
    );
    assert.equal(
      wheelHandled,
      true,
      'native feed scroll is replaced with a navigation action',
    );
    assert.equal(
      await video.executeJavaScript(
        'document.documentElement.dataset.shortSteps',
      ),
      '1',
    );
    const commentsHandled = await video.executeJavaScript(
      `(()=>{const event=new WheelEvent('wheel',{deltaY:650,bubbles:true,cancelable:true});document.getElementById('comments').dispatchEvent(event);return event.defaultPrevented;})()`,
    );
    assert.equal(commentsHandled, false, 'comment scrolling is left alone');

    await video.executeJavaScript(
      'history.pushState({}, "", "/watch?v=fixture123")',
    );
    await until(
      () => documentLoads === 1,
      'first video gets one automatic document reload',
    );
    await sleep(200);
    await video.executeJavaScript(
      'history.pushState({}, "", "/watch?v=fixture456")',
    );
    await sleep(300);
    assert.equal(
      documentLoads,
      1,
      'later videos must not trigger another refresh',
    );
    const originalId = video.id;
    await main.webContents.executeJavaScript(
      'document.getElementById("mini-button").click()',
    );
    await until(
      () => BrowserWindow.getAllWindows().length === 2,
      'mini player window',
    );
    const mini = BrowserWindow.getAllWindows().find((w) => w !== main);
    await until(
      () => mini.webContents.getURL().includes('mini=1'),
      'mini shell',
    );
    assert.equal(mini.isAlwaysOnTop(), true);
    assert.equal(main.isVisible(), false);
    assert.equal(mini.contentView.children[0].webContents.id, originalId);
    await until(
      () =>
        video.executeJavaScript('!!document.getElementById("ytmd-mini-style")'),
      'video mini layout',
    );
    await mini.webContents.executeJavaScript(
      'document.getElementById("mini-button").click()',
    );
    await until(
      () => BrowserWindow.getAllWindows().length === 1,
      'restore main window',
    );
    assert.equal(main.contentView.children[0].webContents.id, originalId);
    assert.equal(main.isVisible(), true);
    assert.equal(dialogs.length, 0);
    video.emit(
      'did-fail-load',
      {},
      -3,
      'ERR_ABORTED',
      'https://www.youtube.com/',
      true,
    );
    video.emit(
      'did-fail-load',
      {},
      -105,
      'ERR_NAME_NOT_RESOLVED',
      'https://example.com/',
      false,
    );
    assert.equal(dialogs.length, 0);
    video.emit(
      'did-fail-load',
      {},
      -105,
      'ERR_NAME_NOT_RESOLVED',
      'https://www.youtube.com/',
      true,
    );
    assert.equal(dialogs.length, 1);
    assert.deepEqual(errors, []);
    await main.webContents.executeJavaScript(
      'document.getElementById("settings-button").click()',
    );
    await sleep(200);
    fs.writeFileSync(
      path.join(root, 'settings-preview.png'),
      (await main.webContents.capturePage()).toPNG(),
    );
    fs.writeFileSync(
      path.join(root, 'result.json'),
      JSON.stringify({
        passed: true,
        overlay: true,
        mini: true,
        discordRpc: true,
      }),
    );
  })
  .then(() => finish(), finish);
