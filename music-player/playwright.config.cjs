const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      // Optional system Chromium, useful in restricted CI environments.
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: 'node tests/server.cjs',
    url: 'http://127.0.0.1:4173',
  },
});
