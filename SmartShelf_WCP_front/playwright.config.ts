import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
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
      command: 'npm.cmd run dev',
      url: 'http://127.0.0.1:3000/login',
      cwd: '.',
      reuseExistingServer: true,
      timeout: 180000,
    },
  ],
});
