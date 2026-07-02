import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
import { OBSERVATION_BUCKET_OPTIONS } from '@/lib/profile/labels';
import type { Observation, ObservationBucket } from '@/lib/types';

interface Props {
  diveId: string;
}

export function DiveObservations({ diveId }: Props) {
  const [rows, setRows] = useState<Observation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [bucket, setBucket] = useState<ObservationBucket>('anomaly');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await listObservationsForDive(diveId));
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
        photo_id: null,
      });
      setText('');
      setBucket('anomaly');
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
          ) : null}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => {
                setAdding(false);
                setText('');
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
            return (
              <View key={o.id} style={styles.rowCard}>
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
  stack: {
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
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
