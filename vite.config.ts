import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // This repository is published at https://<owner>.github.io/marketlist/.
  // Keep the app base explicit so generated assets also work on local previews.
  base: '/marketlist/',
  plugins: [tailwindcss(), solid()],
  server: { port: 3000 },
  build: { target: 'esnext' },
});
