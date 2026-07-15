import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { Species, SpeciesPhoto } from '@/lib/types';

const BUCKET = 'species-photos';
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
export const MAX_PHOTO_BYTES = 5_242_880; // 5 MB

export interface SpeciesWithPrimaryPhoto extends Species {
  primary_photo: Pick<SpeciesPhoto, 'storage_path'> | null;
}

async function uriToBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const file = new File(uri);
  return new Uint8Array(await file.arrayBuffer());
}

async function compressToJpeg(uri: string, width: number, height: number): Promise<string> {
  const longest = Math.max(width, height);
  const actions: ImageManipulator.Action[] = [];
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    actions.push({
      resize: {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      },
    });
  }
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

function randomId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function speciesPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function listSpeciesPhotos(speciesId: string): Promise<SpeciesPhoto[]> {
  const { data, error } = await supabase
    .from('species_photos')
    .select('*')
    .eq('species_id', speciesId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SpeciesPhoto[];
}

/**
 * Lists species (verified only) with each row's primary photo (if any).
 * Uses a nested PostgREST select so it's one round-trip regardless of species count.
 * Species without any photos come back with `primary_photo: null`.
 */
export async function listSpeciesWithPrimaryPhoto(
  category?: Species['category'],
): Promise<SpeciesWithPrimaryPhoto[]> {
  let q = supabase
    .from('species')
    .select('*, primary_photo:species_photos(storage_path,is_primary)')
    .eq('is_verified', true)
    .order('common_name');
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((row: unknown) => {
    const r = row as Species & {
      primary_photo: { storage_path: string; is_primary: boolean }[];
    };
    const primary = r.primary_photo?.find((p) => p.is_primary) ?? null;
    return {
      ...r,
      primary_photo: primary ? { storage_path: primary.storage_path } : null,
    };
  });
}

export interface UploadSpeciesPhotoInput {
  speciesId: string;
  uploaderId: string;
  bytes: Uint8Array;
  contentType?: string;
  credit?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
  makePrimary?: boolean;
}

/**
 * Uploads pre-processed image bytes as a species photo row.
 * Caller is responsible for compression + size validation. If makePrimary,
 * demotes any existing primary for the same species in the same transaction-ish
 * flow (two writes; the partial unique index prevents two primaries even under
 * concurrent uploads — second insert will fail loudly).
 */
export async function uploadSpeciesPhotoBytes(
  input: UploadSpeciesPhotoInput,
): Promise<SpeciesPhoto> {
  if (input.bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error(
      `Photo is ${(input.bytes.byteLength / 1_048_576).toFixed(1)} MB — max is 5 MB.`,
    );
  }

  const filename = `${randomId()}.jpg`;
  const storagePath = `${input.speciesId}/${filename}`;
  const contentType = input.contentType ?? 'image/jpeg';

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.bytes, { contentType, upsert: false });
  if (upErr) throw upErr;

  const existing = await listSpeciesPhotos(input.speciesId);
  const wantPrimary = input.makePrimary ?? existing.length === 0;

  if (wantPrimary) {
    const currentPrimary = existing.find((p) => p.is_primary);
    if (currentPrimary) {
      const { error } = await supabase
        .from('species_photos')
        .update({ is_primary: false })
        .eq('id', currentPrimary.id);
      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }
    }
  }

  const { data: row, error: insErr } = await supabase
    .from('species_photos')
    .insert({
      species_id: input.speciesId,
      storage_path: storagePath,
      is_primary: wantPrimary,
      credit: input.credit ?? null,
      source_url: input.sourceUrl ?? null,
      license: input.license ?? null,
      uploaded_by: input.uploaderId,
    })
    .select('*')
    .single();

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insErr;
  }
  return row as SpeciesPhoto;
}

/** Pick an image from the device library, compress, and upload as a species photo. */
export async function pickAndUploadSpeciesPhoto(
  speciesId: string,
  uploaderId: string,
  opts: {
    credit?: string | null;
    sourceUrl?: string | null;
    license?: string | null;
    makePrimary?: boolean;
  } = {},
): Promise<SpeciesPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission denied.');
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled || picked.assets.length === 0) return null;
  const asset = picked.assets[0];
  const compressedUri = await compressToJpeg(asset.uri, asset.width, asset.height);
  const bytes = await uriToBytes(compressedUri);
  return uploadSpeciesPhotoBytes({
    speciesId,
    uploaderId,
    bytes,
    contentType: 'image/jpeg',
    ...opts,
  });
}

/**
 * Sets the given photo as primary and demotes any existing primary for its species.
 * The partial unique index protects against split-brain if two admins race.
 */
export async function setPrimarySpeciesPhoto(photoId: string): Promise<void> {
  const { data: target, error: readErr } = await supabase
    .from('species_photos')
    .select('id, species_id, is_primary')
    .eq('id', photoId)
    .single();
  if (readErr) throw readErr;
  const row = target as { id: string; species_id: string; is_primary: boolean };
  if (row.is_primary) return;

  const { data: currentPrimary, error: findErr } = await supabase
    .from('species_photos')
    .select('id')
    .eq('species_id', row.species_id)
    .eq('is_primary', true)
    .maybeSingle();
  if (findErr) throw findErr;

  if (currentPrimary) {
    const { error } = await supabase
      .from('species_photos')
      .update({ is_primary: false })
      .eq('id', (currentPrimary as { id: string }).id);
    if (error) throw error;
  }
  const { error } = await supabase
    .from('species_photos')
    .update({ is_primary: true })
    .eq('id', photoId);
  if (error) throw error;
}

/**
 * Deletes the photo row and its storage object. If the deleted photo was primary,
 * the DB trigger auto-promotes the newest remaining photo to primary.
 */
export async function deleteSpeciesPhoto(photo: SpeciesPhoto): Promise<void> {
  const { error: delRowErr } = await supabase
    .from('species_photos')
    .delete()
    .eq('id', photo.id);
  if (delRowErr) throw delRowErr;
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
}
