/**
 * §5 universal rule: hashtags in observations link to species records.
 * These tests cover the DB-side of hashtag resolution: given a tag, find the
 * matching species id via slug (with underscore↔hyphen tolerance).
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { resolveTagToSpeciesId, syncHashtagsForObservation } from './parse';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getAllCalls, __getLastCall, __reset, __setNextResponse, __setResponses } = mock;

beforeEach(() => __reset());

describe('resolveTagToSpeciesId', () => {
  test('queries species with the tag plus underscore/hyphen variants', async () => {
    __setNextResponse({ data: [{ id: 'sp1' }], error: null });
    const res = await resolveTagToSpeciesId('elkhorn_coral');
    expect(res).toBe('sp1');
    const call = __getLastCall();
    const inOp = call?.ops.find((o) => o.op === 'in');
    expect(inOp?.args[0]).toBe('slug');
    const slugs = inOp?.args[1] as string[];
    expect(slugs).toContain('elkhorn_coral');
    expect(slugs).toContain('elkhorn-coral');
  });

  test('returns null when no species matches', async () => {
    __setNextResponse({ data: [], error: null });
    await expect(resolveTagToSpeciesId('unknown_tag')).resolves.toBeNull();
  });

  test('returns null (does not throw) when DB errors', async () => {
    __setNextResponse({ data: null, error: new Error('boom') });
    await expect(resolveTagToSpeciesId('anything')).resolves.toBeNull();
  });
});

describe('syncHashtagsForObservation — universal #hashtag rule', () => {
  test('clears existing mentions then inserts parsed tags with resolved species ids', async () => {
    __setResponses(
      { data: null, error: null }, // delete existing
      { data: [{ id: 'sp-a' }], error: null }, // resolve #a
      { data: [{ id: 'sp-b' }], error: null }, // resolve #b
      { data: null, error: null }, // insert
    );
    await syncHashtagsForObservation('obs-1', 'Saw #alpha and #beta today');
    const calls = __getAllCalls();
    // First call clears existing.
    expect(calls[0].table).toBe('hashtag_mentions');
    expect(calls[0].ops.some((o) => o.op === 'delete')).toBe(true);
    // Final call inserts the new mentions.
    const insertCall = calls.find((c) => c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'));
    expect(insertCall).toBeTruthy();
    const payload = insertCall!.ops.find((o) => o.op === 'insert')?.args[0] as any[];
    expect(payload).toHaveLength(2);
    expect(payload.map((r) => r.tag).sort()).toEqual(['alpha', 'beta']);
    expect(payload.every((r) => r.observation_id === 'obs-1')).toBe(true);
  });

  test('when no tags parsed, only deletes existing (no insert)', async () => {
    __setResponses({ data: null, error: null }); // delete
    await syncHashtagsForObservation('obs-1', 'nothing to see here');
    const calls = __getAllCalls();
    const insertCall = calls.find((c) => c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'));
    expect(insertCall).toBeUndefined();
  });

  test('allows unresolved tags (species_id null) — spec: "generate a specific database"', async () => {
    __setResponses(
      { data: null, error: null }, // delete
      { data: [], error: null },   // resolve returns empty
      { data: null, error: null }, // insert
    );
    await syncHashtagsForObservation('obs-1', '#novel_species_never_seen');
    const insertCall = __getAllCalls().find((c) => c.table === 'hashtag_mentions' && c.ops.some((o) => o.op === 'insert'));
    const payload = insertCall!.ops.find((o) => o.op === 'insert')?.args[0] as any[];
    expect(payload[0].tag).toBe('novel_species_never_seen');
    expect(payload[0].species_id).toBeNull();
  });
});
