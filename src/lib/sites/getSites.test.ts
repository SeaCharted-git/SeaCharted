/**
 * §2 spec: users access a list of Cozumel dive site names + GPS.
 * getSites reads from supabase and falls back to the local seed on error.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { getSiteBySlug, getSites } from './getSites';
// eslint-disable-next-line import/first
import { cozumelSeed } from './seed-cozumel';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('getSites — dive site list', () => {
  test('returns rows from supabase when available', async () => {
    const rows = [{ id: 'x', slug: 'x', name: 'X', lat: 20.5, lng: -86.9 }];
    __setNextResponse({ data: rows, error: null });
    const res = await getSites();
    expect(res).toEqual(rows);
  });

  test('falls back to the local Cozumel seed when supabase is empty', async () => {
    __setNextResponse({ data: [], error: null });
    const res = await getSites();
    expect(res).toEqual(cozumelSeed);
  });

  test('falls back to the local Cozumel seed when supabase errors', async () => {
    __setNextResponse({ data: null, error: new Error('network') });
    const res = await getSites();
    expect(res).toEqual(cozumelSeed);
  });

  test('local fallback still gives valid GPS for every site (§2 GPS)', async () => {
    __setNextResponse({ data: [], error: null });
    const res = await getSites();
    for (const s of res) {
      expect(Number.isFinite(s.lat)).toBe(true);
      expect(Number.isFinite(s.lng)).toBe(true);
    }
  });
});

describe('getSiteBySlug — single-site lookup', () => {
  test('returns the row from supabase when found', async () => {
    const row = { id: '1', slug: 'san-juan', name: 'San Juan Reef', lat: 20.549, lng: -86.9318 };
    __setNextResponse({ data: row, error: null });
    const res = await getSiteBySlug('san-juan');
    expect(res).toEqual(row);
  });

  test('falls back to seed when supabase returns null', async () => {
    __setNextResponse({ data: null, error: null });
    const res = await getSiteBySlug('san-juan');
    expect(res?.slug).toBe('san-juan');
    expect(res?.name).toBe('San Juan Reef');
  });

  test('falls back to seed when supabase errors', async () => {
    __setNextResponse({ data: null, error: new Error('boom') });
    const res = await getSiteBySlug('barracuda-reef');
    expect(res?.slug).toBe('barracuda-reef');
  });

  test('returns null when slug not in supabase nor seed', async () => {
    __setNextResponse({ data: null, error: null });
    const res = await getSiteBySlug('does-not-exist-xyz');
    expect(res).toBeNull();
  });
});
