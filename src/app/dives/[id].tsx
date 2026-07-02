import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { DivePhotos } from '@/components/dive/DivePhotos';
import { DiveConditions } from '@/components/dive/DiveConditions';
import { DiveSightings } from '@/components/dive/DiveSightings';
import { DiveObservations } from '@/components/dive/DiveObservations';
import { FormField, inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { deleteDive, getDiveById, updateDive, type DiveWithSite } from '@/lib/dives/getDives';

export default function DiveDetailScreen() {
  return (
    <AuthGuard>
      <DiveDetail />
    </AuthGuard>
  );
}

function DiveDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [dive, setDive] = useState<DiveWithSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [diveDate, setDiveDate] = useState('');
  const [maxDepth, setMaxDepth] = useState('');
  const [duration, setDuration] = useState('');
  const [buddy, setBuddy] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      getDiveById(id)
        .then((d) => {
          if (cancelled) return;
          setDive(d);
          if (d) {
            setDiveDate(d.dive_date);
            setMaxDepth(d.max_depth_m?.toString() ?? '');
            setDuration(d.duration_min?.toString() ?? '');
            setBuddy(d.buddy_name ?? '');
            setNotes(d.notes ?? '');
            setIsPublic(d.is_public);
          }
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  async function saveBasics() {
    if (!dive) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(diveDate)) {
      setError('Dive date must be YYYY-MM-DD.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateDive(dive.id, {
        dive_date: diveDate,
        max_depth_m: maxDepth.trim() ? parseFloat(maxDepth) : null,
        duration_min: duration.trim() ? parseInt(duration, 10) : null,
        buddy_name: buddy.trim() || null,
        notes: notes.trim() || null,
        is_public: isPublic,
      });
      setDive({ ...dive, ...updated });
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!dive) return;
    const doDelete = async () => {
      setBusy(true);
      try {
        await deleteDive(dive.id);
        router.replace('/dives');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Delete failed.');
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Delete this dive? Photos, sightings, and observations tied to it are also removed.')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete this dive?', 'Photos, sightings, and observations tied to it are also removed.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  if (!id) return null;
  if (error && !dive) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }
  if (!dive) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user || dive.user_id !== user.id) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default">This dive belongs to a different diver.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">{dive.site?.name ?? 'Unknown site'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dive.dive_date}
            </ThemedText>
          </View>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)} style={styles.secondaryButton}>
              <ThemedText type="small">Edit basics</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.editStack}>
            <FormField label="Date" hint="YYYY-MM-DD">
              <TextInput
                style={inputStyles.input}
                value={diveDate}
                onChangeText={setDiveDate}
                autoCorrect={false}
              />
            </FormField>
            <FormField label="Max depth (m)">
              <TextInput
                style={inputStyles.input}
                value={maxDepth}
                onChangeText={setMaxDepth}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Duration (min)">
              <TextInput
                style={inputStyles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Buddy">
              <TextInput style={inputStyles.input} value={buddy} onChangeText={setBuddy} />
            </FormField>
            <FormField label="Notes">
              <TextInput
                style={[inputStyles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </FormField>
            <View style={styles.publicRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">Public dive</ThemedText>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>
            {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}
            <View style={styles.stepButtons}>
              <Pressable
                onPress={() => setEditing(false)}
                disabled={busy}
                style={[styles.secondaryButton, styles.flex]}
              >
                <ThemedText type="default">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={saveBasics}
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
                  <ThemedText type="default" style={inputStyles.primaryButtonText}>Save</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.basics}>
            <BasicsRow label="Depth" value={dive.max_depth_m ? `${dive.max_depth_m} m` : '—'} />
            <BasicsRow label="Duration" value={dive.duration_min ? `${dive.duration_min} min` : '—'} />
            <BasicsRow label="Buddy" value={dive.buddy_name ?? '—'} />
            <BasicsRow label="Visibility" value={dive.is_public ? 'Public' : 'Private'} />
            {dive.notes ? (
              <View style={styles.notesBlock}>
                <ThemedText type="smallBold">Notes</ThemedText>
                <ThemedText type="default">{dive.notes}</ThemedText>
              </View>
            ) : null}
          </View>
        )}

        <DivePhotos diveId={dive.id} />
        <DiveConditions dive={dive} onUpdated={(d) => setDive({ ...dive, ...d })} />
        <DiveSightings diveId={dive.id} />
        <DiveObservations diveId={dive.id} />

        <Pressable onPress={confirmDelete} disabled={busy} style={styles.deleteButton}>
          <ThemedText type="small" style={styles.deleteText}>
            Delete this dive
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function BasicsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.basicsRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  basics: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
  },
  basicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notesBlock: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  editStack: {
    gap: Spacing.three,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  stepButtons: {
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
  deleteButton: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#802020',
    alignItems: 'center',
  },
  deleteText: {
    color: '#ff6b6b',
  },
});
