const assert = require("node:assert/strict");
const { app, session } = require("electron");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const http = require("node:http");
mkdirSync(path.resolve(__dirname, "../.verification"), { recursive: true });
const resultPath = path.resolve(__dirname, "../.verification/adblock-result.json");
const { loadTypeScript } = require("./load-typescript.cjs");
const { MusicAdBlocker } = loadTypeScript("src/main/services/ytmviewmanager/adblocker.ts");

app.whenReady().then(async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ytmd-adblock-test-"));
  const music = session.fromPartition("adblock-test");
  const server = http.createServer((_request, response) => response.end("song"));
  let resolveRefresh;
  const original = ElectronBlocker.fromPrebuiltAdsOnly;
  ElectronBlocker.fromPrebuiltAdsOnly = () => new Promise(resolve => { resolveRefresh = resolve; });
  const blocker = new MusicAdBlocker(music, path.join(dir, "engine.bin"));
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    blocker.setEnabled(true);
    assert.equal(blocker.engine.isBlockingEnabled(music), true);
    await assert.rejects(music.fetch("https://googleads.g.doubleclick.net/pagead/test"), /ERR_BLOCKED_BY_CLIENT/);
    const response = await music.fetch(`http://127.0.0.1:${server.address().port}/song`);
    assert.equal(await response.text(), "song");
    blocker.setEnabled(false);
    assert.equal(blocker.engine.isBlockingEnabled(music), false);
    // A completed download must not override a toggle or reattach after shutdown.
    blocker.stop();
    resolveRefresh(ElectronBlocker.parse("||doubleclick.net^"));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(blocker.engine.isBlockingEnabled(music), false);
    writeFileSync(path.join(dir, "corrupt.bin"), "invalid cache");
    const fallback = new MusicAdBlocker(music, path.join(dir, "corrupt.bin"));
    fallback.setEnabled(true);
    await assert.rejects(music.fetch("https://googleads.g.doubleclick.net/pagead/test"), /ERR_BLOCKED_BY_CLIENT/);
    fallback.stop();
    resolveRefresh(ElectronBlocker.parse("||doubleclick.net^"));
    writeFileSync(resultPath, JSON.stringify({ passed: true }));
    console.log("PASS: real Electron session blocks ads, allows content, toggles off, survives corrupt cache, and stays off after shutdown");
  } finally {
    blocker.stop();
    ElectronBlocker.fromPrebuiltAdsOnly = original;
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
}).then(() => app.exit(0), error => { writeFileSync(resultPath, JSON.stringify({ passed: false, error: String(error), stack: error.stack })); console.error(error); app.exit(1); });
