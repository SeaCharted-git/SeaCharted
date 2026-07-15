/**
 * Species photos: admin-uploaded gallery per species with one flagged primary.
 * Primary drives thumbnails on the research index, species detail hero,
 * dive-log picker, and site-page sightings.
 *
 * These tests cover the DB-facing query shape + the primary-flip logic.
 * Storage-side upload/remove are integration-tested, not unit-tested.
 */
jest.mock('@/lib/supabase/client');
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({ uri: 'mock://compressed' })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock('expo-file-system', () => ({ File: class {} }));

// eslint-disable-next-line import/first
import {
  MAX_PHOTO_BYTES,
  deleteSpeciesPhoto,
  listSpeciesPhotos,
  listSpeciesWithPrimaryPhoto,
  setPrimarySpeciesPhoto,
  uploadSpeciesPhotoBytes,
} from './photos';
// eslint-disable-next-line import/first
import type { SpeciesPhoto } from '@/lib/types';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __getLastCall, __getAllCalls, __reset, __setNextResponse } = mock;

beforeEach(() => __reset());

describe('listSpeciesPhotos', () => {
  test('queries species_photos filtered by species_id', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpeciesPhotos('sp-1');
    const call = __getLastCall();
    expect(call?.table).toBe('species_photos');
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'species_id' && o.args[1] === 'sp-1'))
      .toBe(true);
  });

  test('orders primary first, then oldest first within a species', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpeciesPhotos('sp-1');
    const orders = __getLastCall()?.ops.filter((o) => o.op === 'order') ?? [];
    expect(orders[0].args[0]).toBe('is_primary');
    expect((orders[0].args[1] as { ascending: boolean }).ascending).toBe(false);
    expect(orders[1].args[0]).toBe('created_at');
    expect((orders[1].args[1] as { ascending: boolean }).ascending).toBe(true);
  });

  test('returns [] when the DB returns null', async () => {
    __setNextResponse({ data: null, error: null });
    await expect(listSpeciesPhotos('sp-1')).resolves.toEqual([]);
  });

  test('surfaces DB errors', async () => {
    __setNextResponse({ data: null, error: new Error('boom') });
    await expect(listSpeciesPhotos('sp-1')).rejects.toThrow('boom');
  });
});

describe('listSpeciesWithPrimaryPhoto — thumbnails for research index', () => {
  test('queries species with a nested species_photos select', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpeciesWithPrimaryPhoto();
    const call = __getLastCall();
    expect(call?.table).toBe('species');
    const selectOp = call?.ops.find((o) => o.op === 'select');
    expect(selectOp?.args[0]).toContain('species_photos');
  });

  test('filters to verified species only', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpeciesWithPrimaryPhoto();
    expect(
      __getLastCall()?.ops.some(
        (o) => o.op === 'eq' && o.args[0] === 'is_verified' && o.args[1] === true,
      ),
    ).toBe(true);
  });

  test('filters by category when passed', async () => {
    __setNextResponse({ data: [], error: null });
    await listSpeciesWithPrimaryPhoto('coral');
    expect(
      __getLastCall()?.ops.some(
        (o) => o.op === 'eq' && o.args[0] === 'category' && o.args[1] === 'coral',
      ),
    ).toBe(true);
  });

  test('maps the primary photo out of the nested array', async () => {
    __setNextResponse({
      data: [
        {
          id: 'sp-1',
          slug: 'elkhorn-coral',
          common_name: 'Elkhorn Coral',
          scientific_name: 'Acropora palmata',
          category: 'coral',
          description: null,
          source_reference: null,
          is_verified: true,
          submitted_by: null,
          created_at: 'x',
          primary_photo: [
            { storage_path: 'sp-1/aaa.jpg', is_primary: false },
            { storage_path: 'sp-1/bbb.jpg', is_primary: true },
            { storage_path: 'sp-1/ccc.jpg', is_primary: false },
          ],
        },
      ],
      error: null,
    });
    const res = await listSpeciesWithPrimaryPhoto();
    expect(res[0].primary_photo).toEqual({ storage_path: 'sp-1/bbb.jpg' });
  });

  test('returns primary_photo: null when the species has no photos', async () => {
    __setNextResponse({
      data: [
        { id: 'sp-2', common_name: 'X', category: 'fish', is_verified: true, primary_photo: [] },
      ],
      error: null,
    });
    const res = await listSpeciesWithPrimaryPhoto();
    expect(res[0].primary_photo).toBeNull();
  });

  test('returns primary_photo: null when the nested array has photos but none primary', async () => {
    __setNextResponse({
      data: [
        {
          id: 'sp-3',
          common_name: 'X',
          category: 'fish',
          is_verified: true,
          primary_photo: [
            { storage_path: 'sp-3/aaa.jpg', is_primary: false },
            { storage_path: 'sp-3/bbb.jpg', is_primary: false },
          ],
        },
      ],
      error: null,
    });
    const res = await listSpeciesWithPrimaryPhoto();
    expect(res[0].primary_photo).toBeNull();
  });
});

describe('uploadSpeciesPhotoBytes — size cap enforcement', () => {
  test('rejects bytes over 5 MB before hitting storage or DB', async () => {
    const oversize = new Uint8Array(MAX_PHOTO_BYTES + 1);
    await expect(
      uploadSpeciesPhotoBytes({
        speciesId: 'sp-1',
        uploaderId: 'u-1',
        bytes: oversize,
      }),
    ).rejects.toThrow(/max is 5 MB/);
    // No DB calls should have happened.
    expect(__getAllCalls()).toEqual([]);
  });

  test('MAX_PHOTO_BYTES is 5 MB exactly', () => {
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe('setPrimarySpeciesPhoto — primary swap', () => {
  test('no-op when the target is already primary', async () => {
    __setNextResponse({
      data: { id: 'p-1', species_id: 'sp-1', is_primary: true },
      error: null,
    });
    await setPrimarySpeciesPhoto('p-1');
    const calls = __getAllCalls();
    // Only the initial read call, no updates.
    expect(calls).toHaveLength(1);
    expect(calls[0].ops.some((o) => o.op === 'update')).toBe(false);
  });

  test('demotes the current primary and promotes the target', async () => {
    __setNextResponse({
      data: { id: 'p-new', species_id: 'sp-1', is_primary: false },
      error: null,
    });
    __setNextResponse({ data: { id: 'p-old' }, error: null }); // find current primary
    __setNextResponse({ data: null, error: null }); // demote old
    __setNextResponse({ data: null, error: null }); // promote new
    await setPrimarySpeciesPhoto('p-new');
    const calls = __getAllCalls();
    expect(calls).toHaveLength(4);
    // Third call demotes old primary.
    const demote = calls[2];
    const demoteUpdate = demote.ops.find((o) => o.op === 'update');
    expect((demoteUpdate?.args[0] as { is_primary: boolean }).is_primary).toBe(false);
    const demoteEq = demote.ops.find((o) => o.op === 'eq' && o.args[0] === 'id');
    expect(demoteEq?.args[1]).toBe('p-old');
    // Fourth call promotes new.
    const promote = calls[3];
    const promoteUpdate = promote.ops.find((o) => o.op === 'update');
    expect((promoteUpdate?.args[0] as { is_primary: boolean }).is_primary).toBe(true);
    const promoteEq = promote.ops.find((o) => o.op === 'eq' && o.args[0] === 'id');
    expect(promoteEq?.args[1]).toBe('p-new');
  });

  test('handles the case where the species has no current primary', async () => {
    __setNextResponse({
      data: { id: 'p-only', species_id: 'sp-1', is_primary: false },
      error: null,
    });
    __setNextResponse({ data: null, error: null }); // no current primary
    __setNextResponse({ data: null, error: null }); // promote target
    await setPrimarySpeciesPhoto('p-only');
    const calls = __getAllCalls();
    expect(calls).toHaveLength(3);
    // Only the target-promote update; no demote.
    const promote = calls[2];
    expect(
      (promote.ops.find((o) => o.op === 'update')?.args[0] as { is_primary: boolean })
        .is_primary,
    ).toBe(true);
  });
});

describe('deleteSpeciesPhoto — DB row deletion', () => {
  test('deletes from species_photos by id (storage delete follows, trigger handles auto-promote)', async () => {
    __setNextResponse({ data: null, error: null });
    const photo: SpeciesPhoto = {
      id: 'p-1',
      species_id: 'sp-1',
      storage_path: 'sp-1/aaa.jpg',
      is_primary: true,
      credit: null,
      source_url: null,
      license: null,
      uploaded_by: 'u-1',
      created_at: 'x',
    };
    await deleteSpeciesPhoto(photo);
    const call = __getLastCall();
    expect(call?.table).toBe('species_photos');
    expect(call?.ops.some((o) => o.op === 'delete')).toBe(true);
    expect(call?.ops.some((o) => o.op === 'eq' && o.args[0] === 'id' && o.args[1] === 'p-1'))
      .toBe(true);
  });

  test('surfaces the row-delete error and does not swallow it', async () => {
    __setNextResponse({ data: null, error: new Error('permission denied') });
    const photo: SpeciesPhoto = {
      id: 'p-1',
      species_id: 'sp-1',
      storage_path: 'sp-1/aaa.jpg',
      is_primary: false,
      credit: null,
      source_url: null,
      license: null,
      uploaded_by: 'u-1',
      created_at: 'x',
    };
    await expect(deleteSpeciesPhoto(photo)).rejects.toThrow('permission denied');
  });
});
