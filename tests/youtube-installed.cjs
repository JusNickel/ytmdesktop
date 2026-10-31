// Run with Node, against the extracted RPM's actual fused executable.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const assert = require('node:assert/strict');
const binary = path.resolve(
  process.argv[2] ||
    'out/YouTube Desktop AdBlock-linux-x64/youtube-desktop-adblock',
);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ytmd-installed-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(binary, [`--remote-debugging-port=${port}`], {
    env: { ...process.env, XDG_CONFIG_HOME: profile, APPDATA: profile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  let ws;
  try {
    let page;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) throw new Error(`App exited: ${logs}`);
      try {
        page = (
          await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
        ).find((p) => p.url === 'ytmd-video://shell/index.html');
      } catch {}
      if (page) break;
      await sleep(100);
    }
    assert(page, `Packaged shell did not load: ${logs}`);
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const result = JSON.parse(event.data);
      if (pending.has(result.id)) {
        pending.get(result.id)(result);
        pending.delete(result.id);
      }
    };
    async function evaluate(expression) {
      const request = ++id;
      const resultPromise = new Promise((resolve) =>
        pending.set(request, resolve),
      );
      ws.send(
        JSON.stringify({
          id: request,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true },
        }),
      );
      const result = await resultPromise;
      assert(!result.result.exceptionDetails, JSON.stringify(result));
      return result.result.result.value;
    }
    let ready = false;
    for (let i = 0; i < 50; i++) {
      ready = await evaluate(
        '!!window.desktop && typeof document.getElementById("settings-button")?.onclick === "function"',
      );
      if (ready) break;
      await sleep(100);
    }
    assert(ready, 'Packaged local bridge and controls must load');
    await evaluate('document.getElementById("settings-button").click()');
    assert.equal(
      await evaluate('document.getElementById("settings").hidden'),
      false,
    );
    assert.equal(
      await evaluate(
        'getComputedStyle(document.querySelector("header")).height',
      ),
      '56px',
    );
    assert.equal(await evaluate('typeof require'), 'undefined');
    await evaluate(
      'document.getElementById("settings-close").click(); document.getElementById("mini-button").click()',
    );
    let mini;
    for (let i = 0; i < 50; i++) {
      mini = (
        await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      ).find((p) => p.url === 'ytmd-video://shell/index.html?mini=1');
      if (mini) break;
      await sleep(100);
    }
    assert(mini, 'Packaged mini shell must load');
    assert(!logs.includes('ERR_FILE_NOT_FOUND'), logs);
    fs.mkdirSync(path.resolve('.verification'), { recursive: true });
    fs.writeFileSync(
      path.resolve('.verification/installed-runtime-result.json'),
      JSON.stringify({
        passed: true,
        binary,
        controls: true,
        settings: true,
        mini: true,
      }),
    );
    console.log(
      'PASS: actual packaged executable loads shell, CSS, bridge, settings and mini player',
    );
  } finally {
    ws?.close();
    child.kill('SIGTERM');
    await new Promise((resolve) =>
      child.exitCode !== null ? resolve() : child.once('exit', resolve),
    );
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
