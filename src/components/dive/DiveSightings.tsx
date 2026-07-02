import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SIGHTING_COUNT_OPTIONS, SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import {
  deleteSighting,
  listSightingsForDive,
  upsertSighting,
  type SightingWithSpecies,
} from '@/lib/sightings/getSightings';
import { listSpecies } from '@/lib/species/getSpecies';
import type { SightingCount, Species, SpeciesCategory } from '@/lib/types';

interface Props {
  diveId: string;
}

export function DiveSightings({ diveId }: Props) {
  const [rows, setRows] = useState<SightingWithSpecies[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await listSightingsForDive(diveId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [diveId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function removeSighting(id: string) {
    try {
      await deleteSighting(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Sightings</ThemedText>
        <Pressable onPress={() => setPickerOpen(true)} style={inputStyles.primaryButton}>
          <ThemedText type="small" style={inputStyles.primaryButtonText}>Add sighting</ThemedText>
        </Pressable>
      </View>

      {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

      {rows === null ? (
        <ActivityIndicator />
      ) : rows.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No species logged for this dive.
        </ThemedText>
      ) : (
        <View style={styles.stack}>
          {rows.map((s) => (
            <View key={s.id} style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <ThemedText type="default">{s.species?.common_name ?? 'Unknown'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.species?.scientific_name}
                  {' · '}
                  {SIGHTING_COUNT_OPTIONS.find((o) => o.value === s.count_bucket)?.label ?? s.count_bucket}
                </ThemedText>
                {s.note ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {s.note}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable onPress={() => removeSighting(s.id)}>
                <ThemedText type="small" style={inputStyles.errorText}>Remove</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <SightingPicker
        visible={pickerOpen}
        diveId={diveId}
        onClose={() => setPickerOpen(false)}
        onSaved={() => {
          setPickerOpen(false);
          refresh();
        }}
      />
    </View>
  );
}

interface PickerProps {
  visible: boolean;
  diveId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SightingPicker({ visible, diveId, onClose, onSaved }: PickerProps) {
  const [category, setCategory] = useState<SpeciesCategory>('fish');
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Species | null>(null);
  const [count, setCount] = useState<SightingCount>('count_1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    listSpecies(category)
      .then((s) => setSpecies(s))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [visible, category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return species;
    return species.filter(
      (s) =>
        s.common_name.toLowerCase().includes(q) ||
        s.scientific_name.toLowerCase().includes(q),
    );
  }, [species, search]);

  async function save() {
    if (!selected) {
      setError('Pick a species first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertSighting({
        dive_id: diveId,
        species_id: selected.id,
        count_bucket: count,
        note: note.trim() || null,
      });
      setSelected(null);
      setCount('count_1');
      setNote('');
      setSearch('');
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <ScrollView contentContainerStyle={styles.modalScroll} style={styles.modalBg}>
        <View style={styles.modalHeader}>
          <ThemedText type="title">Add sighting</ThemedText>
          <Pressable onPress={onClose}>
            <ThemedText type="small" themeColor="textSecondary">Close</ThemedText>
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
            placeholder="Common or scientific name…"
            placeholderTextColor="#666"
          />
        </FormField>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.speciesList}>
            {filtered.slice(0, 40).map((sp) => {
              const isSel = selected?.id === sp.id;
              return (
                <Pressable
                  key={sp.id}
                  onPress={() => setSelected(sp)}
                  style={[styles.speciesRow, isSel && styles.speciesRowSel]}
                >
                  <ThemedText type="default" style={isSel ? styles.selectedText : undefined}>
                    {sp.common_name}
                  </ThemedText>
                  <ThemedText type="small" themeColor={isSel ? undefined : 'textSecondary'} style={isSel ? styles.selectedText : undefined}>
                    {sp.scientific_name}
                  </ThemedText>
                </Pressable>
              );
            })}
            {filtered.length > 40 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Showing 40 of {filtered.length} — refine your search.
              </ThemedText>
            ) : null}
          </View>
        )}

        {selected ? (
          <>
            <FormField label={`How many ${selected.common_name}?`}>
              <PillSelect value={count} onChange={(v) => v && setCount(v)} options={SIGHTING_COUNT_OPTIONS} />
            </FormField>
            <FormField label="Note (optional)">
              <TextInput
                style={[inputStyles.input, styles.notesInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Behavior, size, depth…"
                placeholderTextColor="#666"
                multiline
              />
            </FormField>
          </>
        ) : null}

        {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

        <Pressable
          onPress={save}
          disabled={busy || !selected}
          style={({ pressed }) => [
            inputStyles.primaryButton,
            (pressed || busy || !selected) && inputStyles.buttonDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="default" style={inputStyles.primaryButtonText}>
              Save sighting
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stack: {
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
  },
  modalBg: {
    backgroundColor: '#000',
  },
  modalScroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  speciesList: {
    gap: Spacing.one,
  },
  speciesRow: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  speciesRowSel: {
    backgroundColor: '#00c1d1',
    borderColor: '#00c1d1',
  },
  selectedText: {
    color: '#000',
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
