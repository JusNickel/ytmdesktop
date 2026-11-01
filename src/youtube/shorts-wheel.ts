// Turn a wheel/trackpad gesture into one Shorts navigation action. Native scroll
// can move the shared player out of its reel without advancing YouTube's feed.
export class ShortsWheelNavigator {
  private total = 0;
  private lastEvent = -Infinity;
  private lastNavigation = -Infinity;
  public step(
    deltaX: number,
    deltaY: number,
    mode: number,
    now: number,
  ): -1 | 0 | 1 {
    if (!Number.isFinite(deltaY) || Math.abs(deltaX) > Math.abs(deltaY))
      return 0;
    if (now - this.lastNavigation < 700) return 0;
    const delta = deltaY * (mode === 1 ? 40 : mode === 2 ? 600 : 1);
    if (
      now - this.lastEvent > 200 ||
      Math.sign(delta) !== Math.sign(this.total)
    )
      this.total = 0;
    this.lastEvent = now;
    this.total += delta;
    if (Math.abs(this.total) < 60) return 0;
    const direction = this.total > 0 ? 1 : -1;
    this.total = 0;
    this.lastNavigation = now;
    return direction;
  }
}
