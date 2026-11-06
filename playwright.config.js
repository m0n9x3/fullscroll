import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/browser',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1024, height: 720 },
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:4173/test/browser/fixture.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
