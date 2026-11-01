import { contextBridge, ipcRenderer } from 'electron';
// This bridge exists only in the packaged local shell, never on YouTube.
contextBridge.exposeInMainWorld('desktop', {
  command: (command: string, value?: unknown) =>
    ipcRenderer.send('shell:command', command, value),
  onSettings: (callback: (open: boolean) => void) =>
    ipcRenderer.on('shell:settings', (_event, open) => callback(open === true)),
  onState: (callback: (state: unknown) => void) => {
    ipcRenderer.on('shell:state', (_event, state) => callback(state));
    ipcRenderer.send('shell:ready');
  },
});
