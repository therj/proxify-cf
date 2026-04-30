import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Vite emits hashed bundles to dist/assets; worker static hosting expects dist/admin/assets for `/admin/assets/*`. */
function moveAssetsUnderAdmin(): Plugin {
  return {
    name: 'move-assets-under-admin',
    closeBundle() {
      const dist = path.join(rootDir, 'dist');
      const looseAssets = path.join(dist, 'assets');
      const targetDir = path.join(dist, 'admin', 'assets');
      if (!fs.existsSync(looseAssets)) return;
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
      fs.renameSync(looseAssets, targetDir);
    },
  };
}

export default defineConfig({
  base: '/admin/',
  plugins: [react(), moveAssetsUnderAdmin()],
  build: {
    rollupOptions: {
      input: path.resolve(rootDir, 'admin/index.html'),
    },
  },
  server: {
    open: '/admin/',
    proxy: {
      '/admin/api/v1': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
