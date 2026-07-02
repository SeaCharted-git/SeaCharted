import { Link, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SIGHTING_COUNT_OPTIONS, SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import { getSightingsForSpecies, type PublicSighting } from '@/lib/research/queries';
import { getSpeciesBySlug, listSpecies } from '@/lib/species/getSpecies';
import type { Species } from '@/lib/types';

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  try {
    const all = await listSpecies();
    return all.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export default function SpeciesPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [species, setSpecies] = useState<Species | null>(null);
  const [sightings, setSightings] = useState<PublicSighting[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getSpeciesBySlug(slug).then((s) => {
      setSpecies(s);
      setLoaded(true);
      if (s) getSightingsForSpecies(s.id).then(setSightings).catch(() => setSightings([]));
    });
  }, [slug]);

  if (!loaded) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (!species) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default">Species not found.</ThemedText>
      </ThemedView>
    );
  }

  const categoryLabel = SPECIES_CATEGORY_OPTIONS.find((c) => c.value === species.category)?.label ?? species.category;
  const title = `${species.common_name} — Cozumel dive sightings`;
  const desc =
    species.description ??
    `${species.common_name} (${species.scientific_name}) — ${categoryLabel} observed by Cozumel divers on SeaCharted.`;

  return (
    <ThemedView style={styles.container}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
      </Head>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ThemedText type="title">{species.common_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {species.scientific_name} · {categoryLabel}
          </ThemedText>
        </View>

        {species.description ? (
          <ThemedText type="default">{species.description}</ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Field guide taxonomy from{' '}
            {species.source_reference ?? 'community-submitted references'}. SeaCharted authors original
            descriptions; not yet written for this species.
          </ThemedText>
        )}

        <View style={styles.section}>
          <ThemedText type="subtitle">Recent public sightings</ThemedText>
          {sightings === null ? (
            <ActivityIndicator />
          ) : sightings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No public sightings logged yet.
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {sightings.map((s) => (
                <View key={s.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="default">
                      {s.dive?.site ? (
                        <Link href={`/sites/${s.dive.site.slug}`}>
                          <ThemedText type="link">{s.dive.site.name}</ThemedText>
                        </Link>
                      ) : (
                        'Unknown site'
                      )}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.dive?.dive_date} ·{' '}
                      {SIGHTING_COUNT_OPTIONS.find((c) => c.value === s.count_bucket)?.label ?? s.count_bucket}
                    </ThemedText>
                    {s.note ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {s.note}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
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
    gap: Spacing.four,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#222',
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
