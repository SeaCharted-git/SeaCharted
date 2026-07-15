/**
 * §2 spec: users can (eventually) submit new sites. This covers the client-side helper
 * that generates a slug from the name and inserts an unverified row.
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { submitSite } from './submitSite';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('submitSite — user-submitted dive site', () => {
  test('inserts a row with a slugified name + random suffix', async () => {
    __setNextResponse({ data: { id: '1', slug: 'my-secret-spot-abcd' }, error: null });
    const res = await submitSite({
      name: 'My Secret Spot',
      lat: 20.51,
      lng: -86.94,
      description: 'A hidden gem',
      submitted_by: 'u1',
    });
    expect(res.slug).toBeTruthy();
    const call = __getLastCall();
    const payload = call?.ops.find((o) => o.op === 'insert')?.args[0] as any;
    expect(payload.slug).toMatch(/^my-secret-spot-/);
    expect(payload.name).toBe('My Secret Spot');
    expect(payload.lat).toBe(20.51);
    expect(payload.lng).toBe(-86.94);
    expect(payload.submitted_by).toBe('u1');
    expect(payload.is_verified).toBe(false);
  });

  test('slugifies names with special characters', async () => {
    __setNextResponse({ data: { id: '1' }, error: null });
    await submitSite({
      name: "Palancar Caves & Bricks!",
      lat: 20.4,
      lng: -87.0,
      description: null,
      submitted_by: 'u1',
    });
    const payload = __getLastCall()?.ops.find((o) => o.op === 'insert')?.args[0] as any;
    expect(payload.slug).toMatch(/^palancar-caves-bricks-/);
  });

  test('handles a name that would otherwise be an empty slug', async () => {
    __setNextResponse({ data: { id: '1' }, error: null });
    await submitSite({
      name: '!!!',
      lat: 20.5,
      lng: -86.9,
      description: null,
      submitted_by: 'u1',
    });
    const payload = __getLastCall()?.ops.find((o) => o.op === 'insert')?.args[0] as any;
    // slug is base + '-' + suffix; if base is empty we still get -suffix
    expect(payload.slug.length).toBeGreaterThan(0);
  });

  test('throws when supabase errors', async () => {
    __setNextResponse({ data: null, error: new Error('duplicate') });
    await expect(
      submitSite({ name: 'X', lat: 20.5, lng: -86.9, description: null, submitted_by: 'u1' }),
    ).rejects.toThrow('duplicate');
  });
});
