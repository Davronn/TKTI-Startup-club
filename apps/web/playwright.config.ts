import { defineConfig, devices } from '@playwright/test';

/**
 * UI (e2e) testlari. Ishga tushirish: avval `npm run build`, so‘ng `npm run test:e2e -w @startup-club/web`.
 * Serverlar ishlab turgan bo‘lsa, o‘shalardan foydalaniladi; aks holda build qilingan API va web o‘zi ishga tushadi.
 * Brauzer yuklab olinmaydi — kompyuterdagi Microsoft Edge (yoki PW_CHANNEL=chrome) ishlatiladi.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const channel = process.env.PW_CHANNEL || 'msedge';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    channel,
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { channel } },
    {
      name: 'desktop',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Edge'], channel, storageState: 'e2e/.auth/admin.json' },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'node dist/main.js',
          cwd: '../api',
          url: 'http://localhost:4000/api/v1/health',
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'npx next start -p 3000',
          url: 'http://localhost:3000/login',
          reuseExistingServer: true,
          timeout: 90_000,
        },
      ],
});
