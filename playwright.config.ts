import { defineConfig, devices } from '@playwright/test';

/**
 * SeaCharted E2E config.
 *
 * The webServer builds a fresh static export with mock env vars baked in,
 * then serves it on :8081. All Supabase and Mapbox traffic is intercepted
 * by Playwright routes in individual specs (see e2e/*.spec.ts).
 */

const MOCK_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL=https://mock-supabase.test',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY=test-anon-key-must-be-20-chars-long',
  'EXPO_PUBLIC_MAPBOX_TOKEN=pk.test-mapbox-token-for-e2e',
].join(' ');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Assumes `npm run e2e:build` has been run at least once. To rebuild after
    // a code change, remove dist-e2e (or run `npm run e2e:build`) before `npm run test:e2e`.
    command: 'npx serve dist-e2e -l 8081 --single',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
