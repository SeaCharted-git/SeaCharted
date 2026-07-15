/**
 * Playwright route helper that intercepts every Supabase REST + Auth + Storage call
 * and every Mapbox tile request. Tests configure per-endpoint responses via `setMock`.
 *
 * Any un-mocked Supabase path returns `{ data: [], error: null }` (empty list) so
 * the app renders without crashing while individual assertions target the specific
 * endpoints under test.
 */
import type { Page, Route } from '@playwright/test';

export interface MockConfig {
  /** Map of path (or path prefix) → JSON response body. */
  responses?: Record<string, unknown>;
}

const MOCK_SUPABASE_HOST = 'mock-supabase.test';
const MAPBOX_HOST_PATTERNS = [
  /https:\/\/api\.mapbox\.com\//,
  /https:\/\/[a-z]\.tiles\.mapbox\.com\//,
  /https:\/\/events\.mapbox\.com\//,
];

export async function installMocks(page: Page, config: MockConfig = {}): Promise<void> {
  await page.route(new RegExp(`https?://${MOCK_SUPABASE_HOST}/.*`), async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname + url.search;

    // Match longest configured prefix first.
    const key = Object.keys(config.responses ?? {})
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];

    const body = key ? config.responses![key] : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // Silence Mapbox — tiles/styles return a stub.
  for (const pattern of MAPBOX_HOST_PATTERNS) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ features: [] }),
      });
    });
  }
}
