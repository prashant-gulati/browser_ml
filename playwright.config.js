import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  snapshotPathTemplate: 'tests/e2e/snapshots/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    baseURL: 'http://localhost:8080',
    launchOptions: {
      // Silently grants camera permission and feeds a synthetic video track —
      // no real camera is required in tests or CI.
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve . -l 8080 --no-clipboard',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
