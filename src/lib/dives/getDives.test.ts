/**
 * §2 spec: date, maximum dive depth, and location — CRUD for dive records.
 * §4 spec: moon_phase, current_direction, etc. are settable on the same dive record.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { createDive, deleteDive, getDiveById, listMyDives, updateDive } from './getDives';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('listMyDives — scoped to a user, newest-first', () => {
  test('returns rows scoped to the user id', async () => {
    const rows = [
      { id: 'd1', user_id: 'u1', dive_date: '2026-06-10', site: { id: 's1', slug: 'x', name: 'X', lat: 20.5, lng: -86.9 } },
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await listMyDives('u1');
    expect(res).toEqual(rows);
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'user_id' && o.args[1] === 'u1'))
      .toBe(true);
  });

  test('orders by dive_date descending', async () => {
    __setNextResponse({ data: [], error: null });
    await listMyDives('u1');
    const call = __getLastCall();
    const orderOp = call?.ops.find((o) => o.op === 'order');
    expect(orderOp?.args[0]).toBe('dive_date');
    expect((orderOp?.args[1] as any).ascending).toBe(false);
  });

  test('returns [] when no dives', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(listMyDives('u1')).resolves.toEqual([]);
  });
});

describe('getDiveById — single dive with site join', () => {
  test('returns the dive when found', async () => {
    const row = { id: 'd1', user_id: 'u1', dive_date: '2026-06-10', site: null };
    __setNextResponse({ data: row, error: null });
    await expect(getDiveById('d1')).resolves.toEqual(row);
  });

  test('returns null when not found', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(getDiveById('d1')).resolves.toBeNull();
  });
});

describe('createDive — §2 dive record', () => {
  test('inserts with date, depth, and site (spec: date + max depth + location)', async () => {
    __setNextResponse({ data: { id: 'd1' }, error: null });
    await createDive({
      user_id: 'u1',
      site_id: 'site-1',
      dive_date: '2026-07-14',
      max_depth_m: 27.5,
      duration_min: 52,
      buddy_name: 'Ana',
      notes: null,
      is_public: true,
    });
    const payload = __getLastCall()?.ops.find((o) => o.op === 'insert')?.args[0] as any;
    expect(payload.dive_date).toBe('2026-07-14');
    expect(payload.max_depth_m).toBe(27.5);
    expect(payload.site_id).toBe('site-1');
    expect(payload.user_id).toBe('u1');
  });

  test('accepts optional moon_phase (§4)', async () => {
    __setNextResponse({ data: { id: 'd1' }, error: null });
    await createDive({
      user_id: 'u1',
      site_id: 'site-1',
      dive_date: '2026-07-14',
      max_depth_m: 20,
      duration_min: 45,
      buddy_name: null,
      notes: null,
      is_public: false,
      moon_phase: 0.5,
    });
    const payload = __getLastCall()?.ops.find((o) => o.op === 'insert')?.args[0] as any;
    expect(payload.moon_phase).toBe(0.5);
  });

  test('propagates DB errors', async () => {
    __setNextResponse({ data: null, error: new Error('rls') });
    await expect(
      createDive({
        user_id: 'u1', site_id: 's', dive_date: '2026-01-01', max_depth_m: null,
        duration_min: null, buddy_name: null, notes: null, is_public: false,
      }),
    ).rejects.toThrow('rls');
  });
});

describe('updateDive — §4 conditions persistence', () => {
  test('updates sky, wind, current, visibility, water temp, moon_phase together', async () => {
    __setNextResponse({ data: { id: 'd1' }, error: null });
    await updateDive('d1', {
      sky: 'sunny',
      wind_kts: 8,
      wind_dir: 'NE',
      current_strength: 'moderate',
      current_direction: 'normal_s_to_n',
      visibility_m: 30,
      water_temp_c_observed: 27,
      moon_phase: 0.25,
    });
    const patch = __getLastCall()?.ops.find((o) => o.op === 'update')?.args[0] as any;
    expect(patch.sky).toBe('sunny');
    expect(patch.wind_kts).toBe(8);
    expect(patch.wind_dir).toBe('NE');
    expect(patch.current_strength).toBe('moderate');
    expect(patch.current_direction).toBe('normal_s_to_n');
    expect(patch.visibility_m).toBe(30);
    expect(patch.water_temp_c_observed).toBe(27);
    expect(patch.moon_phase).toBe(0.25);
  });

  test('scopes the update to the correct dive id', async () => {
    __setNextResponse({ data: { id: 'd1' }, error: null });
    await updateDive('d1', { max_depth_m: 30 });
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'id' && o.args[1] === 'd1'))
      .toBe(true);
  });
});

describe('deleteDive', () => {
  test('deletes by id', async () => {
    __setNextResponse({ data: null, error: null });
    await deleteDive('d1');
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'delete')).toBe(true);
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'id' && o.args[1] === 'd1'))
      .toBe(true);
  });
});
