import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/browser',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1024, height: 720 },
    // 터치 제스처 검증을 위해 터치 가능한 컨텍스트로 실행합니다.
    hasTouch: true,
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:4173/test/browser/fixture.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
