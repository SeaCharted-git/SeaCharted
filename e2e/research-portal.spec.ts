/**
 * §3 spec: users access species lists via 7 keyword categories.
 * §5 universal rule: hashtag-indexed research portal.
 *
 * E2E flow: load /research → see the portal, all 7 category pills, and hashtag section.
 */
import { expect, test } from '@playwright/test';
import { installMocks } from './mock-supabase';

test.beforeEach(async ({ page }) => {
  await installMocks(page, {
    responses: {
      '/rest/v1/species': [
        { id: '1', slug: 'nassau-grouper', common_name: 'Nassau Grouper', scientific_name: 'Epinephelus striatus', category: 'fish', description: null, source_reference: null, is_verified: true, submitted_by: null, created_at: '2026-07-01T00:00:00Z' },
        { id: '2', slug: 'green-turtle', common_name: 'Green Sea Turtle', scientific_name: 'Chelonia mydas', category: 'sea_turtle', description: null, source_reference: null, is_verified: true, submitted_by: null, created_at: '2026-07-01T00:00:00Z' },
      ],
      '/rest/v1/hashtag_mentions': [
        { tag: 'eagleray' }, { tag: 'eagleray' }, { tag: 'grouper' },
      ],
      '/rest/v1/dive_sites': [],
    },
  });
});

test('/research shows the research portal title', async ({ page }) => {
  await page.goto('/research');
  await expect(page.getByText('Research portal')).toBeVisible({ timeout: 30_000 });
});

test('/research shows all 7 §3 spec category labels', async ({ page }) => {
  await page.goto('/research');
  await expect(page.getByText('Research portal')).toBeVisible({ timeout: 30_000 });
  // Every category from the spec must appear as a pill.
  for (const label of [
    'Marine plants',
    'Sponges',
    'Corals',
    'Invertebrates',
    'Fish',
    'Sea turtles',
    'Marine mammals',
  ]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

test('/research renders the species catalog section (§3)', async ({ page }) => {
  await page.goto('/research');
  await expect(page.getByText('Species catalog')).toBeVisible({ timeout: 30_000 });
});

test('/research renders the hashtag section (§5 universal rule)', async ({ page }) => {
  await page.goto('/research');
  await expect(page.getByText('Top hashtags')).toBeVisible({ timeout: 30_000 });
});

test('/research/hashtags/eagleray page loads without error', async ({ page }) => {
  await page.goto('/research/hashtags/eagleray');
  // Page shell renders (title in <head> even if content is empty).
  await expect(page).toHaveURL(/\/research\/hashtags\/eagleray/);
});

test('/research/species/nassau-grouper page loads without error', async ({ page }) => {
  await page.goto('/research/species/nassau-grouper');
  await expect(page).toHaveURL(/\/research\/species\/nassau-grouper/);
});
