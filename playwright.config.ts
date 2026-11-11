import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests run against `pnpm dev`, which serves the bundled demo library
 * (`--mode mock`): no Jellyfin server, credentials or network are required.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5143',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5143,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { JELLYFIN_PUBLIC_URL: 'http://localhost:8096' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
