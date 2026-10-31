import { existsSync } from 'node:fs';

// Probe every supported client instead of selecting one based on directory
// presence; Discord and Vesktop installations can coexist.
export function discordIPCPaths(
  platform = process.platform,
  runtime = process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    '/tmp',
): string[] {
  if (platform === 'win32')
    return Array.from(
      { length: 10 },
      (_, id) => `\\\\?\\pipe\\discord-ipc-${id}`,
    );
  const prefix = runtime.replace(/\/$/, '');
  const directories = [
    prefix,
    `${prefix}/app/dev.vencord.Vesktop`,
    `${prefix}/.flatpak/dev.vencord.Vesktop/xdg-run`,
    `${prefix}/app/dev.vencord.Vesktop/xdg-run`,
    `${prefix}/app/com.discordapp.Discord`,
    `${prefix}/.flatpak/com.discordapp.Discord/xdg-run`,
    `${prefix}/snap.discord`,
    `${prefix}/vesktop`,
  ];
  const candidates = directories.flatMap((dir) =>
    Array.from({ length: 10 }, (_, id) => `${dir}/discord-ipc-${id}`),
  );
  const existing = candidates.filter((candidate) => existsSync(candidate));
  // Missing clients are retried by the integration's normal retry timer.
  return existing.length ? existing : candidates.slice(0, 10);
}
