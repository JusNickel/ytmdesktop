const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./load-typescript.cjs');
const { parsePlayback, parseSettings } = loadTypeScript('src/youtube/state.ts');
test('old profiles retain adblock while new sharing features default off', () => {
  assert.deepEqual(parseSettings({ adblock: false }), {
    adblock: false,
    discord: false,
    alwaysOnTop: false,
  });
  assert.equal(parseSettings({ discord: 'true' }).discord, false);
});
test('remote metadata is bounded and only canonical video links leave the app', () => {
  const state = parsePlayback({
    url: 'https://www.youtube.com/watch?v=abc123&secret=private',
    title: 'a'.repeat(1000),
    time: Infinity,
    duration: -4,
    available: true,
  });
  assert.equal(state.url, 'https://www.youtube.com/watch?v=abc123');
  assert.equal(state.title.length, 256);
  assert.equal(state.time, 0);
  assert.equal(state.duration, 0);
  assert.equal(
    parsePlayback({ url: 'https://attacker.example/watch?v=abc' }),
    null,
  );
  assert.equal(
    parsePlayback({ url: 'https://www.youtube.com/', available: true })
      .available,
    false,
  );
});
