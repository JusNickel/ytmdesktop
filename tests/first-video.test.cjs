const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function load(relative) {
  const filename = path.resolve(relative);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m.require = (name) =>
    name === './navigation'
      ? load('src/youtube/navigation.ts')
      : module.require(name);
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    filename,
  );
  return m.exports;
}
const { FirstVideoNavigation } = load('src/youtube/first-video.ts');
test('reload only the first SPA video, never home, search, or subsequent videos', () => {
  const first = new FirstVideoNavigation();
  assert.equal(first.observe('https://www.youtube.com/', false), false);
  assert.equal(
    first.observe('https://www.youtube.com/results?search_query=test', true),
    false,
  );
  assert.equal(
    first.observe('https://www.youtube.com/watch?v=first', true),
    true,
  );
  assert.equal(
    first.observe('https://www.youtube.com/watch?v=first', false),
    false,
  );
  assert.equal(
    first.observe('https://www.youtube.com/watch?v=second', true),
    false,
  );
});
test('a first full video load already initializes the player', () => {
  const first = new FirstVideoNavigation();
  assert.equal(
    first.observe('https://www.youtube.com/watch?v=direct', false),
    false,
  );
  assert.equal(
    first.observe('https://www.youtube.com/watch?v=later', true),
    false,
  );
});
test('Shorts scrolling never triggers the regular-video refresh workaround', () => {
  const first = new FirstVideoNavigation();
  assert.equal(
    first.observe('https://www.youtube.com/shorts/one', true),
    false,
  );
  assert.equal(
    first.observe('https://www.youtube.com/shorts/two', true),
    false,
  );
});
