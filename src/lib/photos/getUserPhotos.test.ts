/**
 * §1 spec: "gallery of underwater photos and videos" on the diver profile.
 * These tests cover the profile-gallery aggregation across all of a user's dives.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { getUserPhotos } from './getUserPhotos';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

const basePhoto = (over: Partial<any> = {}) => ({
  id: '1',
  dive_id: 'd1',
  storage_path: 'path.jpg',
  caption: null,
  taken_at: null,
  media_type: 'photo',
  duration_ms: null,
  poster_path: null,
  dives: {
    id: 'd1',
    dive_date: '2026-06-01',
    site_id: 's1',
    dive_sites: { name: 'Palancar' },
  },
  ...over,
});

describe('getUserPhotos — §1 gallery', () => {
  test('returns aggregated photos and videos across a user\'s dives', async () => {
    const rows = [
      basePhoto({ id: '1', media_type: 'photo', taken_at: '2026-06-05T12:00:00Z' }),
      basePhoto({ id: '2', media_type: 'video' }),
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await getUserPhotos('u1');
    expect(res).toHaveLength(2);
    expect(res.map((p) => p.id).sort()).toEqual(['1', '2']);
  });

  test('filters by the user\'s dives via joined table', async () => {
    __setNextResponse({ data: [], error: null });
    await getUserPhotos('u1');
    const call = __getLastCall();
    expect(call?.table).toBe('dive_photos');
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'dives.user_id' && o.args[1] === 'u1'))
      .toBe(true);
  });

  test('sorts photos with taken_at before photos without', async () => {
    const rows = [
      basePhoto({ id: 'no-taken-at', taken_at: null, dives: { id: 'd1', dive_date: '2026-06-01', site_id: 's1', dive_sites: { name: 'A' } } }),
      basePhoto({ id: 'has-taken-at', taken_at: '2026-06-05T12:00:00Z' }),
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await getUserPhotos('u1');
    // has-taken-at should be first (secondary sort in JS after server sort).
    expect(res[0].id).toBe('has-taken-at');
    expect(res[1].id).toBe('no-taken-at');
  });

  test('sorts nulls-taken-at descending by dive_date', async () => {
    const rows = [
      basePhoto({ id: 'older', taken_at: null, dives: { id: 'da', dive_date: '2026-05-01', site_id: 's', dive_sites: { name: 'A' } } }),
      basePhoto({ id: 'newer', taken_at: null, dives: { id: 'db', dive_date: '2026-06-01', site_id: 's', dive_sites: { name: 'B' } } }),
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await getUserPhotos('u1');
    expect(res[0].id).toBe('newer');
    expect(res[1].id).toBe('older');
  });

  test('returns empty array when the user has no photos', async () => {
    __setNextResponse({ data: [], error: null });
    await expect(getUserPhotos('u1')).resolves.toEqual([]);
  });

  test('throws when supabase errors', async () => {
    __setNextResponse({ data: null, error: new Error('rls denied') });
    await expect(getUserPhotos('u1')).rejects.toThrow('rls denied');
  });

  test('caps at 500 photos (limit)', async () => {
    __setNextResponse({ data: [], error: null });
    await getUserPhotos('u1');
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'limit' && o.args[0] === 500)).toBe(true);
  });

  test('includes both photo and video media types (§1: photos and videos)', async () => {
    const rows = [
      basePhoto({ id: 'p1', media_type: 'photo' }),
      basePhoto({ id: 'v1', media_type: 'video', duration_ms: 5000, poster_path: 'p.jpg' }),
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await getUserPhotos('u1');
    const types = res.map((r) => r.media_type).sort();
    expect(types).toEqual(['photo', 'video']);
  });
});
