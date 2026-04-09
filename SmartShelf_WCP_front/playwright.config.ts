import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'powershell -ExecutionPolicy Bypass -File "scripts\\start-backend.ps1"',
      url: 'http://127.0.0.1:8080/healthz',
      cwd: '..\\SmartShelf_WCP_backend',
      reuseExistingServer: true,
      timeout: 180000,
    },
    {
      command: 'cmd /c npm.cmd run build && npx.cmd next start -p 3100',
      url: 'http://127.0.0.1:3100/login',
      cwd: '.',
      reuseExistingServer: false,
      timeout: 300000,
    },
  ],
});
