/**
 * §1 spec: diver profile — name, age, dives count, cert level, nationality, gender, interests.
 * These tests cover the profile read/update/count query layer with a mocked supabase client.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { countAppDives, getProfile, updateProfile } from './getProfile';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('getProfile', () => {
  test('returns the profile row for a given user id', async () => {
    const row = {
      id: 'user-1',
      display_name: 'Kim',
      age_range: '45_54',
      gender: 'female',
      nationality: 'US',
      certification_org: 'padi',
      certification_level: 'Rescue Diver',
      dives_prior_to_app: 42,
      interests: ['macro', 'night dives'],
      is_admin: false,
      home_location: 'Cozumel',
      avatar_url: null,
      is_public: true,
    };
    __setNextResponse({ data: row, error: null });
    const res = await getProfile('user-1');
    expect(res).toEqual(row);
  });

  test('returns null when profile does not exist', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(getProfile('nobody')).resolves.toBeNull();
  });

  test('throws when supabase returns an error', async () => {
    __setNextResponse({ data: null, error: new Error('rls denied') });
    await expect(getProfile('user-1')).rejects.toThrow('rls denied');
  });
});

describe('updateProfile — every §1 field is writable', () => {
  test('writes display_name (spec: name)', async () => {
    __setNextResponse({ data: { id: 'u1', display_name: 'New Name' }, error: null });
    await updateProfile('u1', { display_name: 'New Name' });
    const call = __getLastCall();
    const updateOp = call?.ops.find((o) => o.op === 'update');
    expect((updateOp?.args[0] as any).display_name).toBe('New Name');
  });

  test('writes age_range (spec: age)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { age_range: '45_54' });
    expect(((__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any).age_range).toBe('45_54');
  });

  test('writes dives_prior_to_app (spec: approximate number of dives)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { dives_prior_to_app: 250 });
    expect(((__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any).dives_prior_to_app).toBe(250);
  });

  test('writes certification_org + certification_level (spec: certification level)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { certification_org: 'padi', certification_level: 'Advanced Open Water' });
    const patch = (__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any;
    expect(patch.certification_org).toBe('padi');
    expect(patch.certification_level).toBe('Advanced Open Water');
  });

  test('writes nationality (spec: nationality)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { nationality: 'Canada' });
    expect(((__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any).nationality).toBe('Canada');
  });

  test('writes gender (spec: gender)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { gender: 'non_binary' });
    expect(((__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any).gender).toBe('non_binary');
  });

  test('writes interests as an array (spec: personal interests)', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { interests: ['macro', 'wreck', 'night'] });
    expect(((__getLastCall()?.ops.find((o) => o.op === 'update')?.args[0]) as any).interests)
      .toEqual(['macro', 'wreck', 'night']);
  });

  test('scopes the update to the correct user id', async () => {
    __setNextResponse({ data: { id: 'u1' }, error: null });
    await updateProfile('u1', { display_name: 'X' });
    const call = __getLastCall();
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'id' && o.args[1] === 'u1'))
      .toBe(true);
  });
});

describe('countAppDives — in-app dive count', () => {
  test('returns the count from a head-only select', async () => {
    __setNextResponse({ data: null, count: 17, error: null });
    await expect(countAppDives('u1')).resolves.toBe(17);
  });

  test('returns 0 when count is null', async () => {
    __setNextResponse({ data: null, count: null, error: null });
    await expect(countAppDives('u1')).resolves.toBe(0);
  });
});
