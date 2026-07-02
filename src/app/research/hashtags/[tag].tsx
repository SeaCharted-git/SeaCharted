import { Link, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { OBSERVATION_BUCKET_OPTIONS } from '@/lib/profile/labels';
import { getObservationsForTag, type PublicObservation } from '@/lib/research/queries';

export default function HashtagPage() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [rows, setRows] = useState<PublicObservation[] | null>(null);

  useEffect(() => {
    if (!tag) return;
    getObservationsForTag(tag)
      .then(setRows)
      .catch(() => setRows([]));
  }, [tag]);

  if (!tag) return null;
  const title = `#${tag} · Cozumel diver observations`;
  const desc = `Public diver observations tagged #${tag} on SeaCharted.`;

  return (
    <ThemedView style={styles.container}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
      </Head>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ThemedText type="title">#{tag}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Public diver observations tagged #{tag}.
          </ThemedText>
        </View>

        {rows === null ? (
          <ActivityIndicator />
        ) : rows.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No public observations use this tag yet.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {rows.map((o) => {
              const bucketLabel =
                OBSERVATION_BUCKET_OPTIONS.find((b) => b.value === o.bucket)?.label ?? o.bucket;
              return (
                <View key={o.id} style={styles.row}>
                  <ThemedText type="smallBold">{bucketLabel}</ThemedText>
                  <ThemedText type="default">{o.description}</ThemedText>
                  {o.dive?.site ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      <Link href={`/sites/${o.dive.site.slug}`}>
                        <ThemedText type="link">{o.dive.site.name}</ThemedText>
                      </Link>
                      {' · '}
                      {o.dive.dive_date}
                    </ThemedText>
                  ) : null}
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
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
    gap: Spacing.one,
  },
});
