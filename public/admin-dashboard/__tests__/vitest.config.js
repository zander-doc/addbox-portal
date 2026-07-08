import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['properties/**/*.test.js'],
    globals: true,
    setupFiles: ['./setup.js'],
  },
});
