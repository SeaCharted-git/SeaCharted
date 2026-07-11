import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseHashtags } from '@/lib/hashtags/parse';
import {
  createObservation,
  deleteObservation,
  listObservationsForDive,
} from '@/lib/observations/getObservations';
import { listPhotosForDive, publicUrl } from '@/lib/photos/upload';
import { OBSERVATION_BUCKET_OPTIONS } from '@/lib/profile/labels';
import type { DivePhoto, Observation, ObservationBucket } from '@/lib/types';

interface Props {
  diveId: string;
}

export function DiveObservations({ diveId }: Props) {
  const [rows, setRows] = useState<Observation[] | null>(null);
  const [photos, setPhotos] = useState<DivePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [bucket, setBucket] = useState<ObservationBucket>('anomaly');
  const [text, setText] = useState('');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [obs, pics] = await Promise.all([
        listObservationsForDive(diveId),
        listPhotosForDive(diveId),
      ]);
      setRows(obs);
      // Observations attach photographic evidence per spec; videos not eligible.
      // Videos not eligible; treat missing media_type as photo (pre-Phase-C rows).
      setPhotos(pics.filter((p) => p.media_type !== 'video'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [diveId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save() {
    if (!text.trim()) {
      setError('Write a description first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createObservation({
        dive_id: diveId,
        bucket,
        description: text.trim(),
        photo_id: selectedPhotoId,
      });
      setText('');
      setBucket('anomaly');
      setSelectedPhotoId(null);
      setAdding(false);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteObservation(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const parsedTags = parseHashtags(text);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Specific observations</ThemedText>
        {!adding ? (
          <Pressable onPress={() => setAdding(true)} style={inputStyles.primaryButton}>
            <ThemedText type="small" style={inputStyles.primaryButtonText}>Add</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

      {adding ? (
        <View style={styles.editStack}>
          <FormField label="Category">
            <PillSelect
              value={bucket}
              onChange={(v) => v && setBucket(v)}
              options={OBSERVATION_BUCKET_OPTIONS}
            />
          </FormField>
          <FormField
            label="Description"
            hint="Use #hashtag to tag a species or theme (e.g. #hawksbill_turtle, #coral_bleaching). Hashtags become searchable across the citizen-science dataset."
          >
            <TextInput
              style={[inputStyles.input, styles.notesInput]}
              value={text}
              onChangeText={setText}
              placeholder="Observed a small colony of #brain_coral with pale patches near the crown."
              placeholderTextColor="#666"
              multiline
            />
          </FormField>
          {parsedTags.length > 0 ? (
            <View style={styles.tagRow}>
              {parsedTags.map((t) => (
                <View key={t} style={styles.tagPill}>
                  <ThemedText type="small" style={styles.tagText}>#{t}</ThemedText>
                </View>
              ))}
            </View>
          ) : text.trim() ? (
            <View style={styles.warnBanner}>
              <ThemedText type="small" style={styles.warnText}>
                No hashtags — this observation will save but won&apos;t appear in the citizen-science database.
                Add e.g. #brain_coral or #tailless_eagle_ray to include it.
              </ThemedText>
            </View>
          ) : null}
          <FormField
            label="Attach a photo (optional)"
            hint="Link this observation to a photo you already added to this dive. Useful for diseases, anomalies, or unlisted species."
          >
            {photos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No photos on this dive yet — add one in the Photos section above to link it here.
              </ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                {photos.map((p) => {
                  const sel = selectedPhotoId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPhotoId(sel ? null : p.id)}
                      style={[styles.photoTile, sel && styles.photoTileSel]}
                    >
                      <Image source={{ uri: publicUrl(p.storage_path) }} style={styles.photoImage} contentFit="cover" />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </FormField>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => {
                setAdding(false);
                setText('');
                setSelectedPhotoId(null);
              }}
              disabled={busy}
              style={[styles.secondaryButton, styles.flex]}
            >
              <ThemedText type="default">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={busy}
              style={({ pressed }) => [
                inputStyles.primaryButton,
                styles.flex,
                (pressed || busy) && inputStyles.buttonDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="default" style={inputStyles.primaryButtonText}>Save observation</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {rows === null ? (
        <ActivityIndicator />
      ) : rows.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No specific observations yet.
        </ThemedText>
      ) : (
        <View style={styles.stack}>
          {rows.map((o) => {
            const bucketLabel =
              OBSERVATION_BUCKET_OPTIONS.find((b) => b.value === o.bucket)?.label ?? o.bucket;
            const linkedPhoto = o.photo_id ? photos.find((p) => p.id === o.photo_id) : null;
            return (
              <View key={o.id} style={styles.rowCard}>
                {linkedPhoto ? (
                  <Image
                    source={{ uri: publicUrl(linkedPhoto.storage_path) }}
                    style={styles.rowCardPhoto}
                    contentFit="cover"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{bucketLabel}</ThemedText>
                  <ThemedText type="default">{o.description}</ThemedText>
                </View>
                <Pressable onPress={() => remove(o.id)}>
                  <ThemedText type="small" style={inputStyles.errorText}>Remove</ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  editStack: {
    gap: Spacing.three,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tagPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: '#003b41',
  },
  tagText: {
    color: '#7ee9f2',
  },
  warnBanner: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#8a6d1a',
    backgroundColor: '#2a2010',
  },
  warnText: {
    color: '#f2c76b',
  },
  stack: {
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
  },
  rowCardPhoto: {
    width: 60,
    height: 60,
    borderRadius: Spacing.two,
    backgroundColor: '#222',
  },
  photoStrip: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  photoTile: {
    borderRadius: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  photoTileSel: {
    borderColor: '#00c1d1',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: Spacing.two - 2,
    backgroundColor: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: { flex: 1 },
  secondaryButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    minWidth: 80,
  },
});
