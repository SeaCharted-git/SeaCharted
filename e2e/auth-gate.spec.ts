/**
 * §1 spec: dive log requires a signed-in diver profile. The sign-in page must be
 * reachable from the landing routes.
 */
import { expect, test } from '@playwright/test';
import { installMocks } from './mock-supabase';

test.beforeEach(async ({ page }) => {
  await installMocks(page, {
    responses: {
      '/auth/v1/session': { session: null },
    },
  });
});

test('sign-in page loads', async ({ page }) => {
  const response = await page.goto('/auth/sign-in');
  expect(response?.status()).toBeLessThan(400);
  // Standard sign-in text — the page has an email input + "Send" or similar CTA.
  await expect(page.locator('body')).toContainText(/sign in|email|log in|magic|link/i, { timeout: 30_000 });
});
