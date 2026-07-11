import { defineConfig } from 'vite';

// GitHub Pages serves from /<repo>/; the workflow sets BASE_PATH accordingly.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
