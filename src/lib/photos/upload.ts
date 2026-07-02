import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { DivePhoto } from '@/lib/types';

const BUCKET = 'dive-photos';
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const MAX_PHOTOS_PER_PICK = 10;

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
  // 16 hex chars, plenty of entropy for a per-photo id
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export async function pickAndUploadPhotos(
  userId: string,
  diveId: string,
): Promise<DivePhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission denied.');
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsMultipleSelection: true,
    selectionLimit: MAX_PHOTOS_PER_PICK,
    quality: 1,
  });
  if (picked.canceled) return [];

  const uploaded: DivePhoto[] = [];
  for (const asset of picked.assets) {
    const compressedUri = await compressToJpeg(asset.uri, asset.width, asset.height);
    const bytes = await uriToBytes(compressedUri);
    const filename = `${randomId()}.jpg`;
    const storagePath = `${userId}/${diveId}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase
      .from('dive_photos')
      .insert({
        dive_id: diveId,
        storage_path: storagePath,
        taken_at: asset.exif?.DateTimeOriginal ? new Date(asset.exif.DateTimeOriginal).toISOString() : null,
      })
      .select('*')
      .single();
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw insErr;
    }
    uploaded.push(row as DivePhoto);
  }

  return uploaded;
}

export async function listPhotosForDive(diveId: string): Promise<DivePhoto[]> {
  const { data, error } = await supabase
    .from('dive_photos')
    .select('*')
    .eq('dive_id', diveId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DivePhoto[];
}

export function publicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deletePhoto(photo: DivePhoto): Promise<void> {
  const { error: delRowErr } = await supabase
    .from('dive_photos')
    .delete()
    .eq('id', photo.id);
  if (delRowErr) throw delRowErr;
  await supabase.storage.from('dive-photos').remove([photo.storage_path]);
}

export async function setCoverPhoto(diveId: string, photoId: string | null): Promise<void> {
  const { error } = await supabase
    .from('dives')
    .update({ cover_photo_id: photoId })
    .eq('id', diveId);
  if (error) throw error;
}
