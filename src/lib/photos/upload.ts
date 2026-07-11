import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { DivePhoto } from '@/lib/types';

const PHOTO_BUCKET = 'dive-photos';
const VIDEO_BUCKET = 'dive-videos';
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const POSTER_QUALITY = 0.7;
const MAX_MEDIA_PER_PICK = 10;
const MAX_VIDEO_BYTES = 52_428_800; // 50 MB

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

function guessVideoMime(uri: string, fallback = 'video/mp4'): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return fallback;
}

export async function pickAndUploadPhotos(
  userId: string,
  diveId: string,
): Promise<DivePhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission denied.');
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_MEDIA_PER_PICK,
    quality: 1,
  });
  if (picked.canceled) return [];

  const uploaded: DivePhoto[] = [];
  for (const asset of picked.assets) {
    if (asset.type === 'video') {
      const row = await uploadVideoAsset(asset, userId, diveId);
      uploaded.push(row);
    } else {
      const row = await uploadImageAsset(asset, userId, diveId);
      uploaded.push(row);
    }
  }
  return uploaded;
}

async function uploadImageAsset(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
  diveId: string,
): Promise<DivePhoto> {
  const compressedUri = await compressToJpeg(asset.uri, asset.width, asset.height);
  const bytes = await uriToBytes(compressedUri);
  const filename = `${randomId()}.jpg`;
  const storagePath = `${userId}/${diveId}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });
  if (upErr) throw upErr;

  const takenAt = asset.exif?.DateTimeOriginal
    ? new Date(asset.exif.DateTimeOriginal as string).toISOString()
    : null;

  const { data: row, error: insErr } = await supabase
    .from('dive_photos')
    .insert({
      dive_id: diveId,
      storage_path: storagePath,
      taken_at: takenAt,
      media_type: 'photo',
    })
    .select('*')
    .single();
  if (insErr) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw insErr;
  }
  return row as DivePhoto;
}

async function uploadVideoAsset(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
  diveId: string,
): Promise<DivePhoto> {
  if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video is ${(asset.fileSize / 1_048_576).toFixed(1)} MB — max is 50 MB. Trim or re-encode and try again.`,
    );
  }

  // Generate poster frame at 1s (avoids often-black t=0 frames).
  let posterStoragePath: string | null = null;
  try {
    const { uri: posterUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
      time: 1000,
      quality: POSTER_QUALITY,
    });
    const posterBytes = await uriToBytes(posterUri);
    const posterName = `${randomId()}.jpg`;
    posterStoragePath = `${userId}/${diveId}/${posterName}`;
    const { error: posterErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(posterStoragePath, posterBytes, { contentType: 'image/jpeg', upsert: false });
    if (posterErr) throw posterErr;
  } catch {
    // Poster generation is best-effort; a video without a poster still works.
    posterStoragePath = null;
  }

  const bytes = await uriToBytes(asset.uri);
  const ext = asset.uri.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase() ?? 'mp4';
  const filename = `${randomId()}.${ext}`;
  const storagePath = `${userId}/${diveId}/${filename}`;
  const mime = asset.mimeType ?? guessVideoMime(asset.uri);

  const { error: upErr } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (upErr) {
    if (posterStoragePath) {
      await supabase.storage.from(PHOTO_BUCKET).remove([posterStoragePath]);
    }
    throw upErr;
  }

  const takenAt = asset.exif?.DateTimeOriginal
    ? new Date(asset.exif.DateTimeOriginal as string).toISOString()
    : null;
  const durationMs = typeof asset.duration === 'number' ? Math.round(asset.duration) : null;

  const { data: row, error: insErr } = await supabase
    .from('dive_photos')
    .insert({
      dive_id: diveId,
      storage_path: storagePath,
      taken_at: takenAt,
      media_type: 'video',
      duration_ms: durationMs,
      poster_path: posterStoragePath,
    })
    .select('*')
    .single();
  if (insErr) {
    await supabase.storage.from(VIDEO_BUCKET).remove([storagePath]);
    if (posterStoragePath) {
      await supabase.storage.from(PHOTO_BUCKET).remove([posterStoragePath]);
    }
    throw insErr;
  }
  return row as DivePhoto;
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

export function publicUrl(storagePath: string, bucket: string = PHOTO_BUCKET): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function mediaPublicUrl(media: DivePhoto): string {
  const bucket = media.media_type === 'video' ? VIDEO_BUCKET : PHOTO_BUCKET;
  return publicUrl(media.storage_path, bucket);
}

// Treats missing media_type (pre-Phase-C rows) as 'photo' so legacy data still renders.
export function posterUrl(media: DivePhoto): string | null {
  if (media.media_type === 'video') {
    return media.poster_path ? publicUrl(media.poster_path, PHOTO_BUCKET) : null;
  }
  return publicUrl(media.storage_path, PHOTO_BUCKET);
}

export async function deletePhoto(photo: DivePhoto): Promise<void> {
  const { error: delRowErr } = await supabase
    .from('dive_photos')
    .delete()
    .eq('id', photo.id);
  if (delRowErr) throw delRowErr;
  if (photo.media_type === 'video') {
    await supabase.storage.from(VIDEO_BUCKET).remove([photo.storage_path]);
    if (photo.poster_path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([photo.poster_path]);
    }
  } else {
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  }
}

export async function setCoverPhoto(diveId: string, photoId: string | null): Promise<void> {
  const { error } = await supabase
    .from('dives')
    .update({ cover_photo_id: photoId })
    .eq('id', diveId);
  if (error) throw error;
}
