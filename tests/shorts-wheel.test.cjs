const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./load-typescript.cjs');
const { ShortsWheelNavigator } = loadTypeScript('src/youtube/shorts-wheel.ts');
test('one wheel gesture advances once and ignores its inertial tail', () => {
  const wheel = new ShortsWheelNavigator();
  assert.equal(wheel.step(0, 650, 0, 0), 1);
  assert.equal(wheel.step(0, 400, 0, 100), 0);
  assert.equal(wheel.step(0, 300, 0, 600), 0);
  assert.equal(wheel.step(0, 650, 0, 1000), 1);
});
test('trackpad deltas accumulate and reverse navigation works', () => {
  const wheel = new ShortsWheelNavigator();
  assert.equal(wheel.step(0, 20, 0, 0), 0);
  assert.equal(wheel.step(0, 20, 0, 50), 0);
  assert.equal(wheel.step(0, 20, 0, 100), 1);
  assert.equal(wheel.step(0, -100, 0, 1000), -1);
});
test('horizontal swipes do not advance Shorts', () => {
  assert.equal(new ShortsWheelNavigator().step(200, 20, 0, 0), 0);
});
