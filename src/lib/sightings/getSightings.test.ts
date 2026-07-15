/**
 * §3 spec: sightings recorded against a dive, joined to the species catalog.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { deleteSighting, listSightingsForDive, upsertSighting } from './getSightings';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('listSightingsForDive', () => {
  test('returns sightings scoped to a dive with species joined', async () => {
    const rows = [
      { id: 's1', dive_id: 'd1', species_id: 'sp1', count_bucket: 'count_2_5', note: null, species: { id: 'sp1', slug: 'grouper', common_name: 'Nassau Grouper', scientific_name: 'Epinephelus striatus', category: 'fish' } },
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await listSightingsForDive('d1');
    expect(res).toEqual(rows);
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'dive_id' && o.args[1] === 'd1'))
      .toBe(true);
  });

  test('returns [] when data is null', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(listSightingsForDive('d1')).resolves.toEqual([]);
  });
});

describe('upsertSighting — dedup per dive+species', () => {
  test('upserts with onConflict on (dive_id, species_id)', async () => {
    __setNextResponse({ data: { id: 's1' }, error: null });
    await upsertSighting({
      dive_id: 'd1',
      species_id: 'sp1',
      count_bucket: 'count_5_20',
      note: 'schooling',
    });
    const call = __getLastCall();
    const upsertOp = call?.ops.find((o) => o.op === 'upsert');
    expect(upsertOp).toBeTruthy();
    const [payload, opts] = upsertOp!.args as [any, any];
    expect(payload.dive_id).toBe('d1');
    expect(payload.species_id).toBe('sp1');
    expect(payload.count_bucket).toBe('count_5_20');
    expect(opts.onConflict).toBe('dive_id,species_id');
  });

  test('accepts all sighting count buckets', async () => {
    const buckets = ['count_1', 'count_2_5', 'count_5_20', 'count_20_plus', 'count_school'] as const;
    for (const b of buckets) {
      __setNextResponse({ data: { id: 's1' }, error: null });
      await upsertSighting({ dive_id: 'd1', species_id: 'sp1', count_bucket: b, note: null });
      const payload = __getLastCall()?.ops.find((o) => o.op === 'upsert')?.args[0] as any;
      expect(payload.count_bucket).toBe(b);
    }
  });

  test('propagates DB errors', async () => {
    __setNextResponse({ data: null, error: new Error('fk violation') });
    await expect(
      upsertSighting({ dive_id: 'd1', species_id: 'sp1', count_bucket: 'count_1', note: null }),
    ).rejects.toThrow('fk violation');
  });
});

describe('deleteSighting', () => {
  test('deletes by id', async () => {
    __setNextResponse({ data: null, error: null });
    await deleteSighting('s1');
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'delete')).toBe(true);
  });
});
