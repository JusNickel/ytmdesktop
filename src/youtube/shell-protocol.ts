import { protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SHELL_URL = 'ytmd-video://shell/index.html';
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ytmd-video',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

// The hardened packaged runtime doesn't grant file:// the development runtime's
// privileges. Serve only bundled shell assets from a dedicated local origin.
export function registerShellProtocol(root: string) {
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
  };
  protocol.handle('ytmd-video', async (request) => {
    const url = new URL(request.url);
    if (url.host !== 'shell' || request.method !== 'GET')
      return new Response('Not found', { status: 404 });
    let filename: string;
    try {
      filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    } catch {
      return new Response('Bad path', { status: 400 });
    }
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      return new Response('Not found', { status: 404 });
    try {
      return new Response(new Uint8Array(await readFile(filename)), {
        headers: {
          'content-type':
            types[path.extname(filename)] ?? 'application/octet-stream',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}
