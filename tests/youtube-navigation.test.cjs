const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./load-typescript.cjs');
const navigation = loadTypeScript('src/youtube/navigation.ts');

test('regular videos, Shorts, subscriptions and login stay in the app', async () => {
  const { isAllowedNavigation, isYouTubePage } = await navigation;
  for (const url of [
    'https://www.youtube.com/watch?v=test',
    'https://youtube.com/shorts/test',
    'https://www.youtube.com/feed/subscriptions',
  ]) {
    assert.equal(isYouTubePage(url), true);
    assert.equal(isAllowedNavigation(url), true);
  }
  assert.equal(
    isAllowedNavigation('https://accounts.google.com/ServiceLogin'),
    true,
  );
  assert.equal(
    isYouTubePage('https://accounts.google.com/ServiceLogin'),
    false,
  );
});
test('external origins, insecure schemes and lookalike domains cannot navigate the app', async () => {
  const { isAllowedNavigation } = await navigation;
  for (const url of [
    'https://example.com/',
    'https://www.youtube.com.attacker.example/',
    'https://accounts.google.com.attacker.example/',
    'http://www.youtube.com/',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'invalid',
  ])
    assert.equal(isAllowedNavigation(url), false, url);
});
