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
    rollupOptions: {
       input: {
        main: resolve(__dirname, 'src/app/index.html'),
        casino: resolve(__dirname, 'src/app/index2.html'),
      },
    },
  },
});
