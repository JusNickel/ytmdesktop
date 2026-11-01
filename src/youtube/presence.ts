import DiscordClient from '../main/integrations/discord-presence/minimal-discord-client';
import {
  DiscordActivityType,
  type DiscordActivity,
} from '../main/integrations/discord-presence/minimal-discord-client/types';
import type { Playback } from './state';

export function activityForVideo(
  state: Playback,
  now = Date.now(),
): DiscordActivity | null {
  if (!state.available || !state.url || !state.title || state.paused)
    return null;
  return {
    type: DiscordActivityType.Watching,
    status_display_type: 2,
    details: state.title.slice(0, 128).padEnd(2, ' '),
    state: state.author.slice(0, 128).padEnd(2, ' '),
    details_url: state.url,
    assets: { large_image: 'ytmd-logo', large_text: 'YouTube Desktop' },
    timestamps:
      state.duration > state.time
        ? {
            start: Math.floor(now - state.time * 1000),
            end: Math.floor(now + (state.duration - state.time) * 1000),
          }
        : undefined,
    buttons: [{ label: 'Watch on YouTube', url: state.url }],
    instance: false,
  };
}

export class VideoPresence {
  private client?: DiscordClient;
  private connected = false;
  private connecting = false;
  private state?: Playback;
  private timer = setInterval(() => this.update(), 15000);
  public status = 'Off';
  constructor(private readonly changed: () => void) {}
  public setEnabled(enabled: boolean) {
    if (!enabled) {
      this.client?.clearActivity();
      this.client?.destroy();
      this.client = undefined;
      this.connected = false;
      this.connecting = false;
      this.status = 'Off';
      this.changed();
      return;
    }
    if (this.client) return;
    const client = (this.client = new DiscordClient('1143202598460076053'));
    this.status = 'Waiting for Discord';
    client.on('connect', () => {
      if (this.client !== client) return;
      this.connected = true;
      this.status = 'Connected';
      this.changed();
      this.update();
    });
    client.on('close', () => {
      if (this.client !== client) return;
      this.connected = false;
      this.status = 'Waiting for Discord';
      this.changed();
    });
    this.update();
  }
  public setPlayback(state: Playback) {
    const previous = this.state;
    this.state = state;
    if (
      !previous ||
      state.url !== previous.url ||
      state.paused !== previous.paused ||
      state.available !== previous.available ||
      Math.abs(state.time - previous.time) > 3
    )
      this.update();
  }
  private update() {
    const client = this.client;
    if (!client) return;
    if (!this.connected) {
      if (this.connecting) return;
      this.connecting = true;
      client
        .connect()
        .catch(() => {})
        .finally(() => {
          if (this.client === client) this.connecting = false;
        });
      return;
    }
    const activity = this.state && activityForVideo(this.state);
    if (activity) client.setActivity(activity);
    else client.clearActivity();
  }
  public stop() {
    clearInterval(this.timer);
    this.setEnabled(false);
  }
}
