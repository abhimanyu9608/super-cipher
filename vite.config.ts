import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH=/ for a custom domain.
const base = process.env.BASE_PATH ?? '/super-cipher/';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
