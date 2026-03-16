import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Separate Vite config for the predict app
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/predict'),
  base: '/baff-predict/',
  build: {
    outDir: resolve(__dirname, 'public/baff-predict'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        predict: resolve(__dirname, 'src/predict/index.html'),
      },
    },
  },
});

