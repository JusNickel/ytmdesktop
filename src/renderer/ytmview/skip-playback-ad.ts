// Match explicit player ad UI, including layouts that no longer set ad-showing.
// Never infer an ad from a video's length, title, or a persistent ad-created class.
const skipSelectors =
  '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button';
const adMarkers =
  '.ytp-ad-simple-ad-badge, .ytp-ad-duration-remaining, .ytp-ad-preview-container, .ytp-ad-text';
function visible(element: HTMLElement): boolean {
  return (
    element.getClientRects().length > 0 &&
    (typeof element.checkVisibility !== 'function' ||
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
  );
}
function findAd(document: Document, activePlayer?: HTMLElement | null) {
  const player =
    activePlayer === undefined
      ? document.querySelector<HTMLElement>('#movie_player')
      : activePlayer;
  if (!player) return null;
  const skip = [
    ...player.querySelectorAll<HTMLButtonElement>(skipSelectors),
  ].find((button) => !button.disabled && visible(button));
  const marked =
    player.matches('.ad-showing, .ad-interrupting') ||
    [...player.querySelectorAll<HTMLElement>(adMarkers)].some(visible);
  return skip || marked ? { player, skip } : null;
}
export function isPlaybackAd(
  document: Document,
  activePlayer?: HTMLElement | null,
): boolean {
  return findAd(document, activePlayer) !== null;
}
export function skipPlaybackAd(
  document: Document,
  activePlayer?: HTMLElement | null,
) {
  const ad = findAd(document, activePlayer);
  if (!ad) return;
  if (ad.skip) {
    ad.skip.click();
    return;
  }
  const video = ad.player.querySelector<HTMLVideoElement>('video');
  if (
    video &&
    Number.isFinite(video.duration) &&
    video.duration > 0 &&
    video.currentTime < video.duration
  ) {
    try {
      video.currentTime = video.duration;
    } catch {
      /* Some ad streams cannot seek. Keep waiting for a real skip button. */
    }
  }
}
