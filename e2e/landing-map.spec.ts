/**
 * §2 spec: users see a map of Cozumel for visual/geographical identification of dive sites.
 * Landing page loads a MapView populated from the local seed (30 Cozumel sites).
 */
import { expect, test } from '@playwright/test';
import { installMocks } from './mock-supabase';

test.beforeEach(async ({ page }) => {
  await installMocks(page, {
    responses: {
      // Force fallback to local seed by returning empty.
      '/rest/v1/dive_sites': [],
    },
  });
});

test('landing page loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
});

test('site detail route responds', async ({ page }) => {
  // 'palancar-caves' is one of the seeded sites (dist has a pre-rendered HTML).
  const response = await page.goto('/sites/palancar-caves');
  expect(response?.status()).toBeLessThan(400);
});
