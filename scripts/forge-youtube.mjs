import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve('@electron-forge/cli/package.json')),
  'dist/electron-forge.js',
);
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, YTMD_VARIANT: 'youtube' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
