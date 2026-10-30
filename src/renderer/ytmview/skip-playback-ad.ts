// Only act when YouTube explicitly marks its player as showing an advertisement.
// Never change playback speed, volume, or the current song's position.
export function skipPlaybackAd(document: Document) {
  const player = document.querySelector(
    '#movie_player.ad-showing, #movie_player.ad-interrupting',
  );
  if (!player) return;
  const skip = player.querySelector<HTMLButtonElement>(
    '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button',
  );
  if (skip && !skip.disabled && skip.getClientRects().length > 0) {
    skip.click();
    return;
  }
  const video = player.querySelector<HTMLVideoElement>('video');
  if (
    video &&
    Number.isFinite(video.duration) &&
    video.duration > 0 &&
    video.currentTime < video.duration
  ) {
    try {
      video.currentTime = video.duration;
    } catch {
      // Some ad streams do not support seeking. Leave those to the filter engine.
    }
  }
}
