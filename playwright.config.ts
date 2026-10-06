import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: 'python3 -m http.server 4174 --bind 127.0.0.1 --directory public',
      url: 'http://127.0.0.1:4174/jaragua-atlas/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
