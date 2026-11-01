// Shorts retains/recycles video elements. Pick the visible player instead of
// whichever video happens to be first in document order.
export function selectVisibleVideo(
  videos: readonly HTMLVideoElement[],
  width: number,
  height: number,
): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null;
  let bestArea = 0;
  for (const video of videos) {
    if (
      typeof video.checkVisibility === 'function' &&
      !video.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })
    )
      continue;
    const rect = video.getBoundingClientRect();
    const area =
      Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left)) *
      Math.max(0, Math.min(height, rect.bottom) - Math.max(0, rect.top));
    if (
      area > bestArea ||
      (area > 0 && area === bestArea && best?.paused && !video.paused)
    ) {
      best = video;
      bestArea = area;
    }
  }
  return best;
}
export function playbackTarget(document: Document) {
  const shorts = document.location.pathname.startsWith('/shorts/');
  const video = shorts
    ? selectVisibleVideo(
        [...document.querySelectorAll<HTMLVideoElement>('video')],
        document.defaultView?.innerWidth ?? 0,
        document.defaultView?.innerHeight ?? 0,
      )
    : document.querySelector<HTMLVideoElement>('#movie_player video, video');
  const player =
    video?.closest<HTMLElement>('.html5-video-player, #movie_player') ?? null;
  return { shorts, video, player };
}
