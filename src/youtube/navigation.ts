export function isYouTubePage(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['www.youtube.com', 'youtube.com'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isAllowedNavigation(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      isYouTubePage(value) ||
      (url.protocol === 'https:' &&
        [
          'accounts.google.com',
          'consent.google.com',
          'consent.youtube.com',
          'accounts.youtube.com',
        ].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
