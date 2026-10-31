import { isYouTubePage } from './navigation';

export class FirstVideoNavigation {
  private initialized = false;
  // First in-page navigation gets a real document load, matching the manual
  // refresh workaround. Later videos retain normal seamless SPA navigation.
  public observe(url: string, inPage: boolean): boolean {
    if (this.initialized || !isYouTubePage(url)) return false;
    const location = new URL(url);
    const video =
      (location.pathname === '/watch' && !!location.searchParams.get('v')) ||
      /^\/shorts\/[^/]+/.test(location.pathname);
    if (!video) return false;
    this.initialized = true;
    return inPage;
  }
}
