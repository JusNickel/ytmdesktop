export type Settings = {
  adblock: boolean;
  discord: boolean;
  alwaysOnTop: boolean;
};
export type Playback = {
  title: string;
  author: string;
  url: string;
  time: number;
  duration: number;
  paused: boolean;
  available: boolean;
};
export const defaultSettings: Settings = {
  adblock: true,
  discord: false,
  alwaysOnTop: false,
};
export const emptyPlayback: Playback = {
  title: '',
  author: '',
  url: '',
  time: 0,
  duration: 0,
  paused: true,
  available: false,
};
export function parseSettings(value: unknown): Settings {
  const data =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return {
    adblock: data.adblock !== false,
    discord: data.discord === true,
    alwaysOnTop: data.alwaysOnTop === true,
  };
}
// All state originating from the remote page is treated as untrusted.
export function parsePlayback(value: unknown): Playback | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.url !== 'string') return null;
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    !['youtube.com', 'www.youtube.com'].includes(url.hostname)
  )
    return null;
  const id =
    url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.startsWith('/shorts/')
        ? url.pathname.split('/')[2]
        : null;
  const validId = id && /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : null;
  return {
    title: typeof data.title === 'string' ? data.title.slice(0, 256) : '',
    author: typeof data.author === 'string' ? data.author.slice(0, 128) : '',
    url: validId ? `https://www.youtube.com/watch?v=${validId}` : '',
    time:
      typeof data.time === 'number' && Number.isFinite(data.time)
        ? Math.max(0, data.time)
        : 0,
    duration:
      typeof data.duration === 'number' && Number.isFinite(data.duration)
        ? Math.max(0, data.duration)
        : 0,
    paused: data.paused !== false,
    available: data.available === true && !!validId,
  };
}
