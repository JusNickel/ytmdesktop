const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./load-typescript.cjs');
const { selectVisibleVideo } = loadTypeScript('src/youtube/playback-target.ts');
const video = (top, bottom, paused = false) => ({
  paused,
  checkVisibility: () => true,
  getBoundingClientRect: () => ({ left: 20, right: 400, top, bottom }),
});
test('scrolling targets the visible next reel instead of a retained previous player', () => {
  const previous = video(-600, -20);
  const active = video(20, 600);
  assert.equal(selectVisibleVideo([previous, active], 800, 700), active);
});
test('no visible video means no stale player is returned during a reel transition', () => {
  assert.equal(
    selectVisibleVideo([video(-600, -20), video(800, 1400)], 800, 700),
    null,
  );
});
test('hidden or zero-size video placeholders do not win over active media', () => {
  const hidden = video(0, 600);
  hidden.checkVisibility = () => false;
  const active = video(20, 500);
  assert.equal(
    selectVisibleVideo([hidden, video(20, 20), active], 800, 700),
    active,
  );
});
