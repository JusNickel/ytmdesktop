import { ElectronBlocker } from '@ghostery/adblocker-electron';
import type { Session } from 'electron';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import log from 'electron-log';

// A small offline fallback protects the first launch while the full list downloads.
const fallbackFilters = [
  '||doubleclick.net^',
  '||googlesyndication.com^',
  '||googleadservices.com^',
  '||youtube.com/api/stats/ads^',
  '||youtube.com/pagead/',
].join('\n');

export class MusicAdBlocker {
  private engine = ElectronBlocker.parse(fallbackFilters);
  private enabled = false;
  private stopped = false;
  private refresh?: Promise<void>;
  private freshCache = false;

  public constructor(
    private readonly musicSession: Session,
    private readonly cachePath: string,
  ) {
    try {
      if (existsSync(cachePath)) {
        this.engine = ElectronBlocker.deserialize(readFileSync(cachePath));
        this.freshCache =
          Date.now() - statSync(cachePath).mtimeMs < 24 * 60 * 60 * 1000;
      }
    } catch (error) {
      log.warn('Ad blocker cache unavailable; using offline filters', error);
    }
  }

  public setEnabled(enabled: boolean) {
    if (this.stopped || enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.engine.enableBlockingInSession(this.musicSession);
      if (!this.freshCache && !this.refresh)
        this.refresh = this.refreshFilters();
    } else {
      this.engine.disableBlockingInSession(this.musicSession);
    }
  }

  private async refreshFilters() {
    try {
      const engine = await ElectronBlocker.fromPrebuiltAdsOnly(url =>
        fetch(url, { signal: AbortSignal.timeout(10_000) }),
      );
      if (this.stopped) return;
      if (this.enabled) this.engine.disableBlockingInSession(this.musicSession);
      this.engine = engine;
      if (this.enabled) this.engine.enableBlockingInSession(this.musicSession);
      this.freshCache = true;
      await writeFile(this.cachePath, this.engine.serialize());
    } catch (error) {
      log.warn(
        'Ad blocker filter update failed; keeping current filters',
        error,
      );
    } finally {
      this.refresh = undefined;
    }
  }

  public stop() {
    this.setEnabled(false);
    this.stopped = true;
  }
}
