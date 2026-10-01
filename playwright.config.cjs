const { defineConfig } = require('@playwright/test');
// Two servers: the SSR component fixture (4310) and the built docs site preview (4320; run `npm run docs:build` first).
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', workers: 1, retries: 0, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4310', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: [
    { command: 'node tests/browser/server.mjs', url: 'http://127.0.0.1:4310', reuseExistingServer: false },
    { command: 'npm run docs:preview', url: 'http://127.0.0.1:4320', reuseExistingServer: false },
  ],
});
