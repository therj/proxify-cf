import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Single SPA: `/` (home) + `/admin/*` (console). Worker serves `dist/index.html` + `dist/assets/*`. */
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: path.resolve(rootDir, 'index.html'),
    },
  },
  server: {
    host: true,
    open: '/',
    proxy: {
      '/admin/api/v1': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
