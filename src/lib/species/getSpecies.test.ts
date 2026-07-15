/**
 * §3 spec: "By entering the keywords: marine plants, sponges, corals, invertebrates, fish,
 * sea turtles, and marine mammals, users should be able to access a list of the species
 * observed during the dive."
 *
 * These tests verify the species-lookup functions correctly query the DB by category
 * and resolve tags → species slugs.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { findSpeciesByTag, getSpeciesBySlug, listSpecies, submitSpecies } from './getSpecies';

// Import mock helpers from the mocked module (same instance as the code under test).
const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('listSpecies — §3 keyword-filtered lookup', () => {
  test('returns species list when no category is passed', async () => {
    const rows = [{ id: '1', slug: 'grouper', category: 'fish' }];
    __setNextResponse({ data: rows, error: null });
    const res = await listSpecies();
    expect(res).toEqual(rows);
    const call = __getLastCall();
    expect(call?.table).toBe('species');
    // Only verified species should surface.
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'is_verified' && o.args[1] === true))
      .toBe(true);
  });

  test('filters by fish category when passed', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpecies('fish');
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'category' && o.args[1] === 'fish'))
      .toBe(true);
  });

  test('filters by each of the 7 spec categories', async () => {
    const cats = ['marine_plant', 'sponge', 'coral', 'invertebrate', 'fish', 'sea_turtle', 'marine_mammal'] as const;
    for (const cat of cats) {
      __setNextResponse({ data: [], error: null });
      await listSpecies(cat);
      const call = __getLastCall();
      expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'category' && o.args[1] === cat))
        .toBe(true);
    }
  });

  test('surfaces DB errors', async () => {
    __setNextResponse({ data: null, error: new Error('boom') });
    await expect(listSpecies()).rejects.toThrow('boom');
  });

  test('returns [] when data is null', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(listSpecies()).resolves.toEqual([]);
  });
});

describe('getSpeciesBySlug', () => {
  test('looks up by slug via maybeSingle', async () => {
    const row = { id: '1', slug: 'elkhorn-coral' };
    __setNextResponse({ data: row, error: null });
    const res = await getSpeciesBySlug('elkhorn-coral');
    expect(res).toEqual(row);
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'slug' && o.args[1] === 'elkhorn-coral'))
      .toBe(true);
    expect(call?.ops.some((o) => o.op === 'maybeSingle')).toBe(true);
  });

  test('returns null when no row found', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(getSpeciesBySlug('nope')).resolves.toBeNull();
  });
});

describe('findSpeciesByTag — hashtag → species resolution', () => {
  test('lowercases tag and swaps underscores for hyphens before slug lookup', async () => {
    __setNextResponse({ data: null, error: null });
    await findSpeciesByTag('Elkhorn_Coral');
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'slug' && o.args[1] === 'elkhorn-coral'))
      .toBe(true);
  });
});

describe('submitSpecies — user-submitted (unverified) entry', () => {
  test('generates a slug from common_name and marks unverified', async () => {
    __setNextResponse({ data: { id: '1', slug: 'tailless-eagle-ray-abc' }, error: null });
    const res = await submitSpecies({
      common_name: 'Tailless Eagle Ray',
      scientific_name: 'Aetobatus narinari (variant)',
      category: 'fish',
      description: 'No tail observed',
      submitted_by: 'user-123',
    });
    expect(res.slug).toMatch(/^tailless-eagle-ray-/);
    const call = __getLastCall();
    const insertOp = call?.ops.find((o) => o.op === 'insert');
    expect(insertOp).toBeTruthy();
    const payload = (insertOp?.args[0] as any);
    expect(payload.is_verified).toBe(false);
    expect(payload.category).toBe('fish');
    expect(payload.submitted_by).toBe('user-123');
  });
});
