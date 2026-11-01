import { isYouTubePage } from './navigation';

export class FirstVideoNavigation {
  private initialized = false;
  // First in-page navigation gets a real document load, matching the manual
  // refresh workaround. Later videos retain normal seamless SPA navigation.
  public observe(url: string, inPage: boolean): boolean {
    if (this.initialized || !isYouTubePage(url)) return false;
    const location = new URL(url);
    // Shorts owns a scrolling/recycled-player lifecycle and must not receive
    // the ordinary watch-page refresh workaround.
    const video =
      location.pathname === '/watch' && !!location.searchParams.get('v');
    if (!video) return false;
    this.initialized = true;
    return inPage;
  }
}
