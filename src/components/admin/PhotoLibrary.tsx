import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BulkPhotoUploader } from '@/components/admin/BulkPhotoUploader';
import { SpeciesPhotosModal } from '@/components/admin/SpeciesPhotosModal';
import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import {
  listSpeciesWithPrimaryPhoto,
  speciesPhotoUrl,
  type SpeciesWithPrimaryPhoto,
} from '@/lib/species/photos';
import type { SpeciesCategory } from '@/lib/types';

interface Props {
  adminUserId: string;
}

export function PhotoLibrary({ adminUserId }: Props) {
  const [category, setCategory] = useState<SpeciesCategory>('fish');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SpeciesWithPrimaryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<SpeciesWithPrimaryPhoto | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const refresh = useCallback(async () => {
    setRows(null);
    setError(null);
    try {
      setRows(await listSpeciesWithPrimaryPhoto(category));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.common_name.toLowerCase().includes(q) ||
        r.scientific_name.toLowerCase().includes(q) ||
        r.slug.includes(q),
    );
  }, [rows, search]);

  const withPhoto = rows?.filter((r) => r.primary_photo).length ?? 0;
  const total = rows?.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">Photo library</ThemedText>
          {rows ? (
            <ThemedText type="small" themeColor="textSecondary">
              {withPhoto} of {total} species in this category have a primary photo.
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={() => setBulkOpen(true)}
          style={({ pressed }) => [styles.bulkBtn, pressed && inputStyles.buttonDisabled]}
        >
          <ThemedText type="small" style={styles.bulkBtnText}>Bulk upload</ThemedText>
        </Pressable>
      </View>

      <FormField label="Category">
        <PillSelect
          value={category}
          onChange={(v) => v && setCategory(v)}
          options={SPECIES_CATEGORY_OPTIONS}
        />
      </FormField>

      <FormField label="Search">
        <TextInput
          style={inputStyles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Common, scientific, or slug…"
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
      </FormField>

      {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

      {rows === null ? (
        <ActivityIndicator />
      ) : filtered.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No species match.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {filtered.map((sp) => (
            <Pressable
              key={sp.id}
              onPress={() => setFocused(sp)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              {sp.primary_photo ? (
                <Image
                  source={{ uri: speciesPhotoUrl(sp.primary_photo.storage_path) }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <ThemedText type="small" themeColor="textSecondary">no photo</ThemedText>
                </View>
              )}
              <ThemedText type="small" numberOfLines={2}>{sp.common_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {sp.scientific_name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <SpeciesPhotosModal
        visible={focused !== null}
        species={focused}
        uploaderId={adminUserId}
        onClose={() => setFocused(null)}
        onChanged={refresh}
      />

      <BulkPhotoUploader
        visible={bulkOpen}
        uploaderId={adminUserId}
        onClose={() => setBulkOpen(false)}
        onDone={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  bulkBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#00c1d1',
  },
  bulkBtnText: {
    color: '#00c1d1',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: 150,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    gap: Spacing.one,
  },
  cardPressed: {
    borderColor: '#00c1d1',
  },
  thumb: {
    width: '100%',
    height: 100,
    borderRadius: Spacing.one,
    backgroundColor: '#222',
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
