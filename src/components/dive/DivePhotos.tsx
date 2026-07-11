import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  deletePhoto,
  listPhotosForDive,
  mediaPublicUrl,
  pickAndUploadPhotos,
  posterUrl,
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
  const [playing, setPlaying] = useState<DivePhoto | null>(null);

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
    const label = photo.media_type === 'video' ? 'video' : 'photo';
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
      if (window.confirm(`Delete this ${label}?`)) doDelete();
    } else {
      Alert.alert(`Delete ${label}?`, undefined, [
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

  function onTilePress(photo: DivePhoto) {
    if (photo.media_type === 'video') {
      setPlaying(photo);
    } else {
      makeCover(photo);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Photos &amp; videos</ThemedText>
        <Pressable
          onPress={upload}
          disabled={busy}
          style={({ pressed }) => [inputStyles.primaryButton, (pressed || busy) && inputStyles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="small" style={inputStyles.primaryButtonText}>
              Add media
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
          No photos or videos yet.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => {
            const thumb = posterUrl(p);
            return (
              <Pressable
                key={p.id}
                style={styles.tile}
                onLongPress={() => confirmDelete(p)}
                onPress={() => onTilePress(p)}
              >
                <View style={styles.imageWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.image} contentFit="cover" />
                  ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                      <ThemedText type="small" themeColor="textSecondary">Video</ThemedText>
                    </View>
                  )}
                  {p.media_type === 'video' ? (
                    <View style={styles.playBadge}>
                      <ThemedText type="small" style={styles.playBadgeText}>▶</ThemedText>
                    </View>
                  ) : null}
                </View>
                {p.caption ? (
                  <ThemedText type="small" numberOfLines={2}>
                    {p.caption}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
      {photos && photos.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Tap a photo to set cover · tap a video to play · long-press to delete
        </ThemedText>
      ) : null}

      <VideoPlayerModal media={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

interface VideoPlayerModalProps {
  media: DivePhoto | null;
  onClose: () => void;
}

function VideoPlayerModal({ media, onClose }: VideoPlayerModalProps) {
  const uri = media ? mediaPublicUrl(media) : null;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (media) player.play();
    else player.pause();
  }, [media, player]);

  if (!media) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <Pressable style={styles.modalCloseHit} onPress={onClose} />
        <VideoView
          player={player}
          style={styles.videoView}
          nativeControls
        />
        <Pressable onPress={onClose} style={styles.modalCloseBtn}>
          <ThemedText type="small" style={styles.modalCloseText}>Close</ThemedText>
        </Pressable>
      </View>
    </Modal>
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
  imageWrap: {
    position: 'relative',
    width: 140,
    height: 140,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: Spacing.two,
    backgroundColor: '#222',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#00c1d1',
  },
  playBadgeText: {
    color: '#7ee9f2',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCloseHit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoView: {
    width: '100%',
    maxWidth: 720,
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  modalCloseBtn: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7ee9f2',
    backgroundColor: 'rgba(0, 195, 209, 0.15)',
  },
  modalCloseText: {
    color: '#7ee9f2',
  },
});
