import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // I parser di Normattiva usano DOMParser: servono le API del browser.
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
