import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import { submitSpecies } from '@/lib/species/getSpecies';
import type { SpeciesCategory } from '@/lib/types';

export default function SubmitSpeciesScreen() {
  return (
    <AuthGuard>
      <SubmitSpecies />
    </AuthGuard>
  );
}

function SubmitSpecies() {
  const router = useRouter();
  const { user } = useAuth();
  const [common, setCommon] = useState('');
  const [scientific, setScientific] = useState('');
  const [category, setCategory] = useState<SpeciesCategory>('fish');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    if (!user) return;
    if (!common.trim() || !scientific.trim()) {
      setError('Common and scientific names are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitSpecies({
        common_name: common.trim(),
        scientific_name: scientific.trim(),
        category,
        description: desc.trim() || null,
        submitted_by: user.id,
      });
      setOk(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">Submit a species</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your submission goes into the review queue and shows up as an option once approved.
        </ThemedText>

        <FormField label="Common name">
          <TextInput style={inputStyles.input} value={common} onChangeText={setCommon} placeholder="e.g. Splendid Toadfish" placeholderTextColor="#666" />
        </FormField>
        <FormField label="Scientific name">
          <TextInput
            style={inputStyles.input}
            value={scientific}
            onChangeText={setScientific}
            placeholder="Genus species"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormField>
        <FormField label="Category">
          <PillSelect value={category} onChange={(v) => v && setCategory(v)} options={SPECIES_CATEGORY_OPTIONS} />
        </FormField>
        <FormField label="Description (optional)" hint="Write your own observation. Do not paste text from copyrighted field guides.">
          <TextInput
            style={[inputStyles.input, styles.notesInput]}
            value={desc}
            onChangeText={setDesc}
            multiline
            placeholder="What it looks like, where you've seen it, behavior…"
            placeholderTextColor="#666"
          />
        </FormField>

        {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}
        {ok ? <ThemedText type="small" style={inputStyles.successText}>Submitted — thanks!</ThemedText> : null}

        <Pressable
          onPress={save}
          disabled={busy}
          style={({ pressed }) => [inputStyles.primaryButton, (pressed || busy) && inputStyles.buttonDisabled]}
        >
          {busy ? <ActivityIndicator /> : <ThemedText type="default" style={inputStyles.primaryButtonText}>Submit for review</ThemedText>}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
