import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig({
  root: 'src/youtube/ui',
  build: {
    outDir: '../../../.vite/renderer/youtube',
    emptyOutDir: true,
    rolldownOptions: {
      input: path.resolve(__dirname, '../../src/youtube/ui/index.html'),
    },
  },
});
