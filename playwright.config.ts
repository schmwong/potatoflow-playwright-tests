import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * The run harness (contract section 1) starts a throw-away server and database and sets E2E_BASE_URL:
 *
 *   npm run e2e:serve -- <test command>        (in the application repository)
 *
 * There is no port or database variable to set here. E2E_BASE_URL is read, never defaulted, so a test
 * cannot silently run against some other server. The check lives in tests/support/global-setup.ts,
 * which does not run for `--list`.
 *
 * E2E_BROWSER_CHANNEL=chrome (or msedge) uses the installed browser instead of Playwright's Chromium.
 */
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests',
  // Outside the repository (it sits in OneDrive). Traces, videos and screenshots stay off, so this is
  // normally empty: the repository is public and so are CI logs.
  outputDir: path.join(os.tmpdir(), 'potatoflow-playwright-output'),
  globalSetup: './tests/support/global-setup.ts',
  fullyParallel: false,
  workers: 1, // one throw-away database per run, and some specs change people in it
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['dot']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    // HTTP routes only: no browser is launched.
    { name: 'api', testMatch: /api-.*\.spec\.ts$/ },
    // The screens, driven in a browser.
    {
      name: 'ui',
      testMatch: /ui-.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
});
