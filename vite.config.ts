import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/app'),
  base: '/baff-mini/',
  build: {
    outDir: resolve(__dirname, 'public/baff-mini'),
    emptyOutDir: true,
  },
});
