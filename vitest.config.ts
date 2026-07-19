import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    // DB integration tests share one SQLite file — run test files sequentially.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
      AUTH_DEV_MODE: 'true',
    },
  },
});
