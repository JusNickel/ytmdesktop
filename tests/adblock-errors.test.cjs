const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');

test('cosmetic script and stylesheet failures are handled without an unhandled rejection', async () => {
  const blocker = ElectronBlocker.parse('||doubleclick.net^');
  blocker.getCosmeticsFilters = () => ({
    active: true,
    styles: 'body{}',
    scripts: ['broken()', 'working()'],
  });
  const executed = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  const caught = [];
  console.error = (...args) => caught.push(args);
  console.warn = (...args) => caught.push(args);
  try {
    await assert.doesNotReject(
      blocker.onInjectCosmeticFilters(
        {
          sender: {
            insertCSS: () => Promise.reject(new Error('fixture CSS failure')),
            executeJavaScript: (script) => {
              executed.push(script);
              return script === 'broken()'
                ? Promise.reject(new Error('fixture script failure'))
                : Promise.resolve();
            },
          },
          frameId: 1,
          processId: 1,
        },
        'https://music.youtube.com/',
      ),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(executed, ['broken()', 'working()']);
    assert.equal(caught.length, 2);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
});
