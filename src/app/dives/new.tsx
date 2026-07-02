import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { FormField, inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { createDive } from '@/lib/dives/getDives';
import { computeMoonPhase } from '@/lib/dives/moon';
import { getSites } from '@/lib/sites/getSites';
import { submitSite } from '@/lib/sites/submitSite';
import type { DiveSite } from '@/lib/types';

type Step = 1 | 2;

export default function NewDiveScreen() {
  return (
    <AuthGuard>
      <NewDiveWizard />
    </AuthGuard>
  );
}

function NewDiveWizard() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [sites, setSites] = useState<DiveSite[]>([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [chosenSiteId, setChosenSiteId] = useState<string | null>(null);

  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLat, setNewSiteLat] = useState('');
  const [newSiteLng, setNewSiteLng] = useState('');
  const [newSiteDesc, setNewSiteDesc] = useState('');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [diveDate, setDiveDate] = useState(today);
  const [maxDepth, setMaxDepth] = useState('');
  const [duration, setDuration] = useState('');
  const [buddy, setBuddy] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSites().then(setSites).catch(() => {});
  }, []);

  const filteredSites = useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => s.name.toLowerCase().includes(q));
  }, [sites, siteSearch]);

  async function goStep2() {
    setError(null);
    if (chosenSiteId) {
      setStep(2);
      return;
    }
    if (!newSiteName.trim()) {
      setError('Pick an existing site or enter a name for a new one.');
      return;
    }
    const lat = parseFloat(newSiteLat);
    const lng = parseFloat(newSiteLng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      const created = await submitSite({
        name: newSiteName.trim(),
        lat,
        lng,
        description: newSiteDesc.trim() || null,
        submitted_by: user.id,
      });
      setChosenSiteId(created.id);
      setSites((prev) => [...prev, created]);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save new site.');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (!user || !chosenSiteId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(diveDate)) {
      setError('Dive date must be YYYY-MM-DD.');
      return;
    }
    const depthN = maxDepth.trim() ? parseFloat(maxDepth) : null;
    const durationN = duration.trim() ? parseInt(duration, 10) : null;
    if (depthN !== null && (!Number.isFinite(depthN) || depthN <= 0)) {
      setError('Max depth must be a positive number.');
      return;
    }
    if (durationN !== null && (!Number.isFinite(durationN) || durationN <= 0)) {
      setError('Duration must be a positive integer.');
      return;
    }
    setBusy(true);
    try {
      const dive = await createDive({
        user_id: user.id,
        site_id: chosenSiteId,
        dive_date: diveDate,
        max_depth_m: depthN,
        duration_min: durationN,
        buddy_name: buddy.trim() || null,
        notes: notes.trim() || null,
        is_public: isPublic,
        moon_phase: computeMoonPhase(diveDate),
      });
      router.replace(`/dives/${dive.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save dive.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">Log a dive</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Step {step} of 2
        </ThemedText>

        {step === 1 ? (
          <>
            <FormField label="Choose a site" hint="Pick from Cozumel's curated sites, or add a new one below.">
              <TextInput
                style={inputStyles.input}
                value={siteSearch}
                onChangeText={setSiteSearch}
                placeholder="Search site name…"
                placeholderTextColor="#666"
              />
              <View style={styles.siteList}>
                {filteredSites.map((s) => {
                  const selected = chosenSiteId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        setChosenSiteId(s.id);
                        setNewSiteName('');
                      }}
                      style={[styles.siteRow, selected && styles.siteRowSelected]}
                    >
                      <ThemedText type="default" style={selected ? styles.siteRowTextSel : undefined}>
                        {s.name}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        themeColor={selected ? undefined : 'textSecondary'}
                        style={selected ? styles.siteRowTextSel : undefined}
                      >
                        {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </FormField>

            <View style={styles.divider} />

            <FormField
              label="Or add a new site"
              hint="Off-list sites become public and discoverable. GPS in decimal degrees (e.g. 20.4536, -87.0165)."
            >
              <TextInput
                style={inputStyles.input}
                value={newSiteName}
                onChangeText={(v) => {
                  setNewSiteName(v);
                  if (v) setChosenSiteId(null);
                }}
                placeholder="Site name"
                placeholderTextColor="#666"
              />
              <View style={styles.gpsRow}>
                <TextInput
                  style={[inputStyles.input, styles.gpsInput]}
                  value={newSiteLat}
                  onChangeText={setNewSiteLat}
                  placeholder="Latitude"
                  placeholderTextColor="#666"
                  keyboardType="numbers-and-punctuation"
                  inputMode="decimal"
                />
                <TextInput
                  style={[inputStyles.input, styles.gpsInput]}
                  value={newSiteLng}
                  onChangeText={setNewSiteLng}
                  placeholder="Longitude"
                  placeholderTextColor="#666"
                  keyboardType="numbers-and-punctuation"
                  inputMode="decimal"
                />
              </View>
              <TextInput
                style={[inputStyles.input, styles.notesInput]}
                value={newSiteDesc}
                onChangeText={setNewSiteDesc}
                placeholder="Short description (optional)"
                placeholderTextColor="#666"
                multiline
              />
            </FormField>

            {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

            <Pressable
              onPress={goStep2}
              disabled={busy}
              style={({ pressed }) => [inputStyles.primaryButton, (pressed || busy) && inputStyles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator /> : (
                <ThemedText type="default" style={inputStyles.primaryButtonText}>Next</ThemedText>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <FormField label="Date" hint="YYYY-MM-DD">
              <TextInput
                style={inputStyles.input}
                value={diveDate}
                onChangeText={setDiveDate}
                placeholder="2026-07-02"
                placeholderTextColor="#666"
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
                placeholder="24"
                placeholderTextColor="#666"
              />
            </FormField>

            <FormField label="Duration (min)">
              <TextInput
                style={inputStyles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                inputMode="numeric"
                placeholder="52"
                placeholderTextColor="#666"
              />
            </FormField>

            <FormField label="Buddy">
              <TextInput
                style={inputStyles.input}
                value={buddy}
                onChangeText={setBuddy}
                placeholder="Buddy name"
                placeholderTextColor="#666"
              />
            </FormField>

            <FormField label="Notes">
              <TextInput
                style={[inputStyles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="What did you see, how did it feel"
                placeholderTextColor="#666"
                multiline
              />
            </FormField>

            <View style={styles.publicRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">Make this dive public</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Public dives contribute to Cozumel citizen-science data.
                </ThemedText>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>

            {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

            <View style={styles.stepButtons}>
              <Pressable
                onPress={() => setStep(1)}
                style={[styles.secondaryButton]}
              >
                <ThemedText type="default">Back</ThemedText>
              </Pressable>
              <Pressable
                onPress={submit}
                disabled={busy}
                style={({ pressed }) => [
                  inputStyles.primaryButton,
                  styles.primaryFlex,
                  (pressed || busy) && inputStyles.buttonDisabled,
                ]}
              >
                {busy ? <ActivityIndicator /> : (
                  <ThemedText type="default" style={inputStyles.primaryButtonText}>Save dive</ThemedText>
                )}
              </Pressable>
            </View>
          </>
        )}
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
  siteList: {
    gap: Spacing.one,
    maxHeight: 320,
  },
  siteRow: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  siteRowSelected: {
    backgroundColor: '#00c1d1',
    borderColor: '#00c1d1',
  },
  siteRowTextSel: {
    color: '#000',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: Spacing.two,
  },
  gpsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gpsInput: {
    flex: 1,
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
  primaryFlex: { flex: 1 },
  secondaryButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    minWidth: 100,
  },
});
