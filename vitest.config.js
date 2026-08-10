import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://fullscroll.test/',
      },
    },
    include: ['test/**/*.test.js'],
    restoreMocks: true,
  },
});
