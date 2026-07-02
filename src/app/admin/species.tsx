import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProfile } from '@/lib/profile/getProfile';
import { SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import { listPendingSpecies, verifySpecies } from '@/lib/species/getSpecies';
import type { Species } from '@/lib/types';

export default function AdminSpeciesScreen() {
  return (
    <AuthGuard>
      <AdminGate />
    </AuthGuard>
  );
}

function AdminGate() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => setIsAdmin(!!p?.is_admin));
  }, [user]);

  if (isAdmin === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (!isAdmin) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default">Admin only.</ThemedText>
      </ThemedView>
    );
  }
  return <ReviewQueue />;
}

function ReviewQueue() {
  const [pending, setPending] = useState<Species[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setPending(await listPendingSpecies());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(id: string, approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      await verifySpecies(id, approve);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">Species review queue</ThemedText>
        {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}
        {pending === null ? (
          <ActivityIndicator />
        ) : pending.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No pending submissions.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {pending.map((s) => {
              const catLabel = SPECIES_CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label ?? s.category;
              return (
                <View key={s.id} style={styles.card}>
                  <ThemedText type="subtitle">{s.common_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {s.scientific_name} · {catLabel}
                  </ThemedText>
                  {s.description ? <ThemedText type="default">{s.description}</ThemedText> : null}
                  <View style={styles.buttonRow}>
                    <Pressable
                      onPress={() => decide(s.id, true)}
                      disabled={busy}
                      style={({ pressed }) => [
                        inputStyles.primaryButton,
                        styles.flex,
                        (pressed || busy) && inputStyles.buttonDisabled,
                      ]}
                    >
                      <ThemedText type="default" style={inputStyles.primaryButtonText}>Approve</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => decide(s.id, false)}
                      disabled={busy}
                      style={[styles.secondaryButton, styles.flex]}
                    >
                      <ThemedText type="default">Keep pending</ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    gap: Spacing.two,
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
  },
});
