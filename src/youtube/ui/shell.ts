import type { Playback, Settings } from '../state';
declare global {
  interface Window {
    desktop: {
      command: (command: string, value?: unknown) => void;
      onSettings: (callback: (open: boolean) => void) => void;
      onState: (
        callback: (state: {
          settings: Settings;
          playback: Playback;
          discord: string;
          mini: boolean;
        }) => void,
      ) => void;
    };
  }
}
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const mini = new URLSearchParams(location.search).get('mini') === '1';
document.body.classList.toggle('mini', mini);
for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-command]',
))
  button.addEventListener('click', () =>
    window.desktop.command(button.dataset.command!),
  );
function settings(open: boolean) {
  el('settings').hidden = !open;
  window.desktop.command('settings', open);
}
window.desktop.onSettings((open) => {
  el('settings').hidden = !open;
});
el('settings-button').onclick = () => settings(true);
el('settings-close').onclick = () => settings(false);
for (const id of ['adblock', 'discord', 'alwaysOnTop'])
  el<HTMLInputElement>(id).onchange = () =>
    window.desktop.command('setting', {
      key: id,
      value: el<HTMLInputElement>(id).checked,
    });
el<HTMLInputElement>('seek').oninput = () =>
  window.desktop.command('seek', Number(el<HTMLInputElement>('seek').value));
el<HTMLInputElement>('volume').oninput = () =>
  window.desktop.command(
    'volume',
    Number(el<HTMLInputElement>('volume').value),
  );
const time = (value: number) =>
  `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, '0')}`;
window.desktop.onState(({ settings: values, playback, discord }) => {
  for (const id of ['adblock', 'discord', 'alwaysOnTop'])
    el<HTMLInputElement>(id).checked = values[id as keyof Settings];
  el('title').textContent = playback.title || 'Ready to watch';
  el('author').textContent = playback.author || 'Find a video on YouTube';
  el('status').textContent = values.adblock ? 'ADBLOCK ON' : 'ADBLOCK OFF';
  el('discord-status').textContent = `Discord: ${discord}`;
  el('play').textContent = playback.paused ? '▶' : 'Ⅱ';
  el('time').textContent = time(playback.time);
  el('duration').textContent = time(playback.duration);
  el<HTMLInputElement>('seek').max = String(Math.max(1, playback.duration));
  el<HTMLInputElement>('seek').value = String(playback.time);
  el<HTMLInputElement>('seek').disabled =
    !playback.available || playback.duration === 0;
});
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') settings(false);
  if (event.ctrlKey && event.key === ',') {
    event.preventDefault();
    settings(true);
  }
});
