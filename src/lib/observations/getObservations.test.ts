/**
 * §5 spec: observations bucket — diseases, unusual fish (anomaly / unlisted species),
 * mating/spawning. Universal rule: hashtags in description feed the searchable DB.
 *
 * These tests verify createObservation inserts and then triggers syncHashtagsForObservation
 * (which parses the description and writes into hashtag_mentions).
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import {
  createObservation,
  deleteObservation,
  listObservationsForDive,
  updateObservation,
} from './getObservations';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getAllCalls, __reset, __setNextResponse, __setResponses } = mock;

beforeEach(() => __reset());

describe('listObservationsForDive', () => {
  test('returns observations scoped to a dive newest-first', async () => {
    const rows = [
      { id: 'o1', dive_id: 'd1', bucket: 'disease', description: 'Coral bleaching' },
    ];
    __setNextResponse({ data: rows, error: null });
    const res = await listObservationsForDive('d1');
    expect(res).toEqual(rows);
  });

  test('returns [] when null', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(listObservationsForDive('d1')).resolves.toEqual([]);
  });
});

describe('createObservation — §5 buckets + hashtag sync', () => {
  test('inserts a disease observation and syncs hashtags', async () => {
    // 1: insert observation returns row
    // 2: delete existing hashtag_mentions
    // 3: for each parsed tag → resolve species (returns null here since no seed)
    // 4: insert hashtag_mentions rows
    __setResponses(
      { data: { id: 'o1', dive_id: 'd1', bucket: 'disease', description: 'Bleached #elkhorn_coral patches', photo_id: null }, error: null },
      { data: null, error: null }, // delete existing
      { data: [], error: null },   // resolveTagToSpeciesId select
      { data: null, error: null }, // insert hashtag rows
    );
    const res = await createObservation({
      dive_id: 'd1',
      bucket: 'disease',
      description: 'Bleached #elkhorn_coral patches',
      photo_id: null,
    });
    expect(res.id).toBe('o1');

    const calls = __getAllCalls();
    const tables = calls.map((c) => c.table);
    expect(tables).toContain('observations');
    expect(tables).toContain('hashtag_mentions');

    const insertMentions = calls.find((c) =>
      c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'),
    );
    expect(insertMentions).toBeTruthy();
    const payload = insertMentions!.ops.find((o) => o.op === 'insert')?.args[0] as any[];
    expect(payload).toHaveLength(1);
    expect(payload[0].tag).toBe('elkhorn_coral');
  });

  test('accepts all 4 spec observation buckets', async () => {
    const buckets = ['disease', 'anomaly', 'unlisted_species', 'mating_spawning'] as const;
    for (const bucket of buckets) {
      __reset();
      __setResponses(
        { data: { id: 'o1', dive_id: 'd1', bucket, description: 'test', photo_id: null }, error: null },
        { data: null, error: null },
      );
      const res = await createObservation({ dive_id: 'd1', bucket, description: 'test', photo_id: null });
      expect(res.bucket).toBe(bucket);
    }
  });

  test('does not insert hashtag rows when description has no tags', async () => {
    __setResponses(
      { data: { id: 'o1', dive_id: 'd1', bucket: 'anomaly', description: 'no tags here', photo_id: null }, error: null },
      { data: null, error: null }, // delete existing
    );
    await createObservation({
      dive_id: 'd1',
      bucket: 'anomaly',
      description: 'no tags here',
      photo_id: null,
    });
    const insertMentions = __getAllCalls().find((c) =>
      c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'),
    );
    expect(insertMentions).toBeUndefined();
  });

  test('propagates insert errors', async () => {
    __setNextResponse({ data: null, error: new Error('rls') });
    await expect(
      createObservation({ dive_id: 'd1', bucket: 'anomaly', description: 'x', photo_id: null }),
    ).rejects.toThrow('rls');
  });
});

describe('updateObservation — re-syncs hashtags when description changes', () => {
  test('re-syncs hashtags when description is patched', async () => {
    __setResponses(
      { data: { id: 'o1', dive_id: 'd1', bucket: 'disease', description: 'new #turtle', photo_id: null }, error: null },
      { data: null, error: null }, // delete
      { data: [], error: null },   // resolve
      { data: null, error: null }, // insert
    );
    await updateObservation('o1', { description: 'new #turtle' });
    const insertMentions = __getAllCalls().find((c) =>
      c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'),
    );
    expect(insertMentions).toBeTruthy();
    const payload = insertMentions!.ops.find((o) => o.op === 'insert')?.args[0] as any[];
    expect(payload[0].tag).toBe('turtle');
  });

  test('does not re-sync when description is not part of the patch', async () => {
    __setNextResponse({ data: { id: 'o1', dive_id: 'd1', bucket: 'disease', description: 'unchanged', photo_id: 'p1' }, error: null });
    await updateObservation('o1', { photo_id: 'p1' });
    const touched = __getAllCalls().some((c) => c.table === 'hashtag_mentions');
    expect(touched).toBe(false);
  });
});

describe('deleteObservation', () => {
  test('deletes by id', async () => {
    __setNextResponse({ data: null, error: null });
    await deleteObservation('o1');
    const call = __getAllCalls()[0];
    expect(call.table).toBe('observations');
    expect(call.ops.some((o) => o.op === 'delete')).toBe(true);
  });
});
