import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { listMyDives, type DiveWithSite } from '@/lib/dives/getDives';

export default function MyDivesScreen() {
  return (
    <AuthGuard>
      <MyDivesList />
    </AuthGuard>
  );
}

function MyDivesList() {
  const { user } = useAuth();
  const [dives, setDives] = useState<DiveWithSite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      setError(null);
      listMyDives(user.id)
        .then((d) => {
          if (!cancelled) setDives(d);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText type="title">My dives</ThemedText>
          <Link href="/dives/new" asChild>
            <Pressable style={inputStyles.primaryButton}>
              <ThemedText type="default" style={inputStyles.primaryButtonText}>
                Log a dive
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        {error ? (
          <ThemedText type="small" style={inputStyles.errorText}>
            {error}
          </ThemedText>
        ) : null}

        {dives === null ? (
          <ActivityIndicator />
        ) : dives.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No dives yet. Log your first one above.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {dives.map((d) => (
              <Link key={d.id} href={`/dives/${d.id}`} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.cardTop}>
                    <ThemedText type="default">
                      {d.site?.name ?? 'Unknown site'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.dive_date}
                    </ThemedText>
                  </View>
                  <View style={styles.cardBottom}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.max_depth_m ? `${d.max_depth_m}m` : '—'} ·{' '}
                      {d.duration_min ? `${d.duration_min}min` : '—'}
                      {d.buddy_name ? ` · with ${d.buddy_name}` : ''}
                    </ThemedText>
                    {d.is_public ? (
                      <ThemedText type="small" style={styles.publicTag}>
                        public
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
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
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  publicTag: {
    color: '#00c1d1',
    fontWeight: '600',
  },
});
