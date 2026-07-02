import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { updateDive } from '@/lib/dives/getDives';
import { computeMoonPhase, moonPhaseLabel } from '@/lib/dives/moon';
import {
  CURRENT_DIR_OPTIONS,
  CURRENT_STRENGTH_OPTIONS,
  SKY_OPTIONS,
  WIND_DIR_OPTIONS,
} from '@/lib/profile/labels';
import type { Dive } from '@/lib/types';

interface Props {
  dive: Dive;
  onUpdated: (patch: Partial<Dive>) => void;
}

export function DiveConditions({ dive, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sky, setSky] = useState(dive.sky);
  const [windKts, setWindKts] = useState(dive.wind_kts?.toString() ?? '');
  const [windDir, setWindDir] = useState(dive.wind_dir);
  const [currentStrength, setCurrentStrength] = useState(dive.current_strength);
  const [currentDirection, setCurrentDirection] = useState(dive.current_direction);
  const [visibility, setVisibility] = useState(dive.visibility_m?.toString() ?? '');
  const [waterTemp, setWaterTemp] = useState(dive.water_temp_c_observed?.toString() ?? '');

  const moonPhase = dive.moon_phase ?? computeMoonPhase(dive.dive_date);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const patch = {
        sky,
        wind_kts: windKts.trim() ? parseFloat(windKts) : null,
        wind_dir: windDir,
        current_strength: currentStrength,
        current_direction: currentDirection,
        visibility_m: visibility.trim() ? parseFloat(visibility) : null,
        water_temp_c_observed: waterTemp.trim() ? parseFloat(waterTemp) : null,
        moon_phase: moonPhase,
      };
      const updated = await updateDive(dive.id, patch);
      onUpdated(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  const anyFilled =
    dive.sky !== null ||
    dive.wind_kts !== null ||
    dive.current_strength !== null ||
    dive.visibility_m !== null ||
    dive.water_temp_c_observed !== null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Conditions</ThemedText>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)} style={styles.secondaryButton}>
            <ThemedText type="small">Edit</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {!editing ? (
        <View style={styles.stack}>
          <Row label="Moon phase" value={`${moonPhaseLabel(moonPhase)} · ${Math.round(moonPhase * 100)}%`} />
          {anyFilled ? (
            <>
              {dive.sky ? <Row label="Sky" value={dive.sky.replace('_', ' ')} /> : null}
              {dive.wind_kts !== null ? (
                <Row
                  label="Wind"
                  value={`${dive.wind_kts} kts${dive.wind_dir ? ' ' + dive.wind_dir : ''}`}
                />
              ) : null}
              {dive.current_strength ? (
                <Row
                  label="Current"
                  value={`${dive.current_strength}${dive.current_direction ? ' · ' + dive.current_direction.replace(/_/g, ' ') : ''}`}
                />
              ) : null}
              {dive.visibility_m !== null ? (
                <Row label="Visibility" value={`${dive.visibility_m} m`} />
              ) : null}
              {dive.water_temp_c_observed !== null ? (
                <Row label="Water temp" value={`${dive.water_temp_c_observed} °C`} />
              ) : null}
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Above/underwater fields not filled in. Tap Edit to add.
            </ThemedText>
          )}
        </View>
      ) : (
        <View style={styles.editStack}>
          <ThemedText type="small" themeColor="textSecondary">
            Moon phase (from date): {moonPhaseLabel(moonPhase)} · {Math.round(moonPhase * 100)}%
          </ThemedText>

          <FormField label="Sky">
            <PillSelect value={sky} onChange={setSky} options={SKY_OPTIONS} allowClear />
          </FormField>

          <FormField label="Wind (kts)">
            <TextInput
              style={inputStyles.input}
              value={windKts}
              onChangeText={setWindKts}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="e.g. 8"
              placeholderTextColor="#666"
            />
          </FormField>

          <FormField label="Wind direction">
            <PillSelect value={windDir} onChange={setWindDir} options={WIND_DIR_OPTIONS} allowClear />
          </FormField>

          <FormField label="Current strength">
            <PillSelect
              value={currentStrength}
              onChange={setCurrentStrength}
              options={CURRENT_STRENGTH_OPTIONS}
              allowClear
            />
          </FormField>

          <FormField label="Current direction">
            <PillSelect
              value={currentDirection}
              onChange={setCurrentDirection}
              options={CURRENT_DIR_OPTIONS}
              allowClear
            />
          </FormField>

          <FormField label="Visibility (m)">
            <TextInput
              style={inputStyles.input}
              value={visibility}
              onChangeText={setVisibility}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="e.g. 25"
              placeholderTextColor="#666"
            />
          </FormField>

          <FormField label="Water temp (°C observed)">
            <TextInput
              style={inputStyles.input}
              value={waterTemp}
              onChangeText={setWaterTemp}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="e.g. 27"
              placeholderTextColor="#666"
            />
          </FormField>

          {error ? (
            <ThemedText type="small" style={inputStyles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => setEditing(false)}
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
                <ThemedText type="default" style={inputStyles.primaryButtonText}>
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
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
    gap: Spacing.two,
  },
  stack: { gap: Spacing.one },
  editStack: { gap: Spacing.three },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    minWidth: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: { flex: 1 },
});
