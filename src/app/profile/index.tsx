import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { FormField, inputStyles } from '@/components/form/FormField';
import { PillSelect } from '@/components/form/PillSelect';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { countAppDives, getProfile, updateProfile } from '@/lib/profile/getProfile';
import {
  AGE_RANGE_OPTIONS,
  CERT_ORG_OPTIONS,
  GENDER_OPTIONS,
} from '@/lib/profile/labels';
import type { Profile } from '@/lib/types';

export default function ProfileScreen() {
  return (
    <AuthGuard>
      <ProfileEditor />
    </AuthGuard>
  );
}

function ProfileEditor() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appDives, setAppDives] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getProfile(user.id), countAppDives(user.id)])
      .then(([p, c]) => {
        if (cancelled) return;
        setProfile(p);
        setAppDives(c);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [user]);

  function patch(update: Partial<Profile>) {
    setSaved(false);
    setProfile((p) => (p ? { ...p, ...update } : p));
  }

  async function save() {
    if (!profile || !user) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile(user.id, {
        display_name: profile.display_name,
        home_location: profile.home_location,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public,
        age_range: profile.age_range,
        gender: profile.gender,
        nationality: profile.nationality,
        certification_org: profile.certification_org,
        certification_level: profile.certification_level,
        dives_prior_to_app: profile.dives_prior_to_app,
        interests: profile.interests,
      });
      setProfile(updated);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <ThemedView style={styles.centered}>
        {error ? (
          <ThemedText type="small" style={inputStyles.errorText}>
            {error}
          </ThemedText>
        ) : (
          <ActivityIndicator />
        )}
      </ThemedView>
    );
  }

  const totalDives = (profile.dives_prior_to_app ?? 0) + appDives;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <ThemedText type="title">Your profile</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {user?.email}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Total dives: {totalDives}  ({appDives} logged here + {profile.dives_prior_to_app} prior)
          </ThemedText>
          <Link href="/profile/gallery" asChild>
            <Pressable style={styles.galleryTile}>
              <ThemedText type="smallBold" style={styles.galleryTileText}>
                View gallery →
              </ThemedText>
              <ThemedText type="small" style={styles.galleryTileHint}>
                All your dive photos in one place.
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        <FormField label="Display name">
          <TextInput
            style={inputStyles.input}
            value={profile.display_name ?? ''}
            onChangeText={(v) => patch({ display_name: v || null })}
            placeholder="How other divers see you"
            placeholderTextColor="#666"
          />
        </FormField>

        <FormField label="Home location">
          <TextInput
            style={inputStyles.input}
            value={profile.home_location ?? ''}
            onChangeText={(v) => patch({ home_location: v || null })}
            placeholder="City, region"
            placeholderTextColor="#666"
          />
        </FormField>

        <FormField label="Nationality" hint="ISO 2-letter country code (e.g. US, MX, CA). Hidden on public profile by default.">
          <TextInput
            style={inputStyles.input}
            value={profile.nationality ?? ''}
            onChangeText={(v) =>
              patch({ nationality: v ? v.toUpperCase().slice(0, 2) : null })
            }
            placeholder="US"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            maxLength={2}
          />
        </FormField>

        <FormField
          label="Age range"
          hint="Privacy: we intentionally store an age bucket, not your exact age. Your birth year is never collected."
        >
          <PillSelect
            value={profile.age_range}
            onChange={(v) => patch({ age_range: v })}
            options={AGE_RANGE_OPTIONS}
            allowClear
          />
        </FormField>

        <FormField label="Gender">
          <PillSelect
            value={profile.gender}
            onChange={(v) => patch({ gender: v })}
            options={GENDER_OPTIONS}
            allowClear
          />
        </FormField>

        <FormField label="Certifying agency">
          <PillSelect
            value={profile.certification_org}
            onChange={(v) => patch({ certification_org: v })}
            options={CERT_ORG_OPTIONS}
            allowClear
          />
        </FormField>

        <FormField label="Certification level" hint="e.g. Open Water, Advanced, Rescue, Divemaster">
          <TextInput
            style={inputStyles.input}
            value={profile.certification_level ?? ''}
            onChangeText={(v) => patch({ certification_level: v || null })}
            placeholder="Advanced Open Water"
            placeholderTextColor="#666"
          />
        </FormField>

        <FormField label="Dives before this app" hint="Self-reported count added to your total">
          <TextInput
            style={inputStyles.input}
            value={String(profile.dives_prior_to_app ?? 0)}
            onChangeText={(v) => {
              const n = parseInt(v.replace(/\D/g, ''), 10);
              patch({ dives_prior_to_app: Number.isFinite(n) ? n : 0 });
            }}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        </FormField>

        <FormField label="Interests" hint="Comma-separated: photography, macro, wrecks, nudibranchs…">
          <TextInput
            style={inputStyles.input}
            value={profile.interests.join(', ')}
            onChangeText={(v) =>
              patch({
                interests: v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="photography, reef fish, macro"
            placeholderTextColor="#666"
          />
        </FormField>

        <View style={styles.publicRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">Public profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Other divers can find your name, cert, and public dives.
            </ThemedText>
          </View>
          <Switch
            value={profile.is_public}
            onValueChange={(v) => patch({ is_public: v })}
          />
        </View>

        {error ? (
          <ThemedText type="small" style={inputStyles.errorText}>
            {error}
          </ThemedText>
        ) : null}
        {saved ? (
          <ThemedText type="small" style={inputStyles.successText}>
            Saved.
          </ThemedText>
        ) : null}

        <Pressable
          onPress={save}
          disabled={busy}
          style={({ pressed }) => [
            inputStyles.primaryButton,
            (pressed || busy) && inputStyles.buttonDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="default" style={inputStyles.primaryButtonText}>
              Save profile
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
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
    gap: Spacing.three,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  headerCard: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  galleryTile: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#00c1d1',
    backgroundColor: '#003b41',
    gap: 2,
  },
  galleryTileText: {
    color: '#7ee9f2',
  },
  galleryTileHint: {
    color: '#7ee9f2',
    opacity: 0.8,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
