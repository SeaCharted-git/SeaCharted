import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  deletePhoto,
  listPhotosForDive,
  pickAndUploadPhotos,
  publicUrl,
  setCoverPhoto,
} from '@/lib/photos/upload';
import type { DivePhoto } from '@/lib/types';

interface Props {
  diveId: string;
}

export function DivePhotos({ diveId }: Props) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<DivePhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await listPhotosForDive(diveId);
      setPhotos(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [diveId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function upload() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await pickAndUploadPhotos(user.id, diveId);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(photo: DivePhoto) {
    const doDelete = async () => {
      setBusy(true);
      try {
        await deletePhoto(photo);
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Delete failed.');
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Delete this photo?')) doDelete();
    } else {
      Alert.alert('Delete photo?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function makeCover(photo: DivePhoto) {
    setBusy(true);
    setError(null);
    try {
      await setCoverPhoto(diveId, photo.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Set cover failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Photos</ThemedText>
        <Pressable
          onPress={upload}
          disabled={busy}
          style={({ pressed }) => [inputStyles.primaryButton, (pressed || busy) && inputStyles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="small" style={inputStyles.primaryButtonText}>
              Add photos
            </ThemedText>
          )}
        </Pressable>
      </View>

      {error ? (
        <ThemedText type="small" style={inputStyles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      {photos === null ? (
        <ActivityIndicator />
      ) : photos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No photos yet.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <Pressable
              key={p.id}
              style={styles.tile}
              onLongPress={() => confirmDelete(p)}
              onPress={() => makeCover(p)}
            >
              <Image source={{ uri: publicUrl(p.storage_path) }} style={styles.image} contentFit="cover" />
              {p.caption ? (
                <ThemedText type="small" numberOfLines={2}>
                  {p.caption}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
      {photos && photos.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Tap to set cover · long-press to delete
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: 140,
    gap: Spacing.one,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: Spacing.two,
    backgroundColor: '#222',
  },
});
