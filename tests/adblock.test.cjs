const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTypeScript } = require("./load-typescript.cjs");
const { skipPlaybackAd } = loadTypeScript("src/renderer/ytmview/skip-playback-ad.ts");

function fixture(ad, duration = 30, skip) {
  const video = { duration, currentTime: 5, playbackRate: 1, muted: false };
  const player = { querySelector: (selector) => selector === "video" ? video : skip };
  const document = { querySelector: () => ad ? player : null };
  return { video, document };
}

test("ordinary songs are never seeked or muted", () => {
  const { video, document } = fixture(false, 240);
  skipPlaybackAd(document);
  assert.deepEqual(video, { duration: 240, currentTime: 5, playbackRate: 1, muted: false });
});

test("a detected finite playback ad is seeked to its end", () => {
  const { video, document } = fixture(true);
  skipPlaybackAd(document);
  assert.equal(video.currentTime, 30);
  assert.equal(video.playbackRate, 1);
  assert.equal(video.muted, false);
});

test("a visible skip button takes precedence over seeking", () => {
  let clicks = 0;
  const { video, document } = fixture(true, 30, { disabled: false, getClientRects: () => [1], click: () => clicks++ });
  skipPlaybackAd(document);
  assert.equal(clicks, 1);
  assert.equal(video.currentTime, 5);
});

test("unloaded and live streams are never seeked", () => {
  for (const duration of [NaN, Infinity, 0]) {
    const { video, document } = fixture(true, duration);
    skipPlaybackAd(document);
    assert.equal(video.currentTime, 5);
  }
});

test("hidden skip buttons are not clicked", () => {
  const { document } = fixture(true, Infinity, { getClientRects: () => [], click: () => assert.fail("hidden button clicked") });
  skipPlaybackAd(document);
});
