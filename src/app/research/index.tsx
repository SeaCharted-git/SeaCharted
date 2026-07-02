import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SPECIES_CATEGORY_OPTIONS } from '@/lib/profile/labels';
import { getTopHashtags, type TagCount } from '@/lib/research/queries';
import { listSpecies } from '@/lib/species/getSpecies';
import type { Species, SpeciesCategory } from '@/lib/types';

const PAGE_TITLE = 'Cozumel citizen-science research portal';
const PAGE_DESC =
  'Browse Cozumel dive species, hashtag-indexed observations, and site-level sightings contributed by SeaCharted divers.';

export default function ResearchHub() {
  const [category, setCategory] = useState<SpeciesCategory>('fish');
  const [species, setSpecies] = useState<Species[] | null>(null);
  const [tags, setTags] = useState<TagCount[] | null>(null);

  useEffect(() => {
    setSpecies(null);
    listSpecies(category).then(setSpecies).catch(() => setSpecies([]));
  }, [category]);

  useEffect(() => {
    getTopHashtags().then(setTags).catch(() => setTags([]));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
      </Head>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ThemedText type="title">Research portal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {PAGE_DESC}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Species catalog</ThemedText>
          <View style={styles.categoryRow}>
            {SPECIES_CATEGORY_OPTIONS.map((c) => {
              const sel = category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  style={[styles.categoryPill, sel && styles.categoryPillSel]}
                >
                  <ThemedText type="small" style={sel ? styles.categoryTextSel : undefined}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {species === null ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.grid}>
              {species.slice(0, 60).map((sp) => (
                <Link key={sp.id} href={`/research/species/${sp.slug}`} asChild>
                  <Pressable style={styles.card}>
                    <ThemedText type="default">{sp.common_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {sp.scientific_name}
                    </ThemedText>
                  </Pressable>
                </Link>
              ))}
              {species.length > 60 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {species.length - 60} more in this category — search to filter.
                </ThemedText>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Top hashtags</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Free-text observations bucketed by diver-authored #hashtags.
          </ThemedText>
          {tags === null ? (
            <ActivityIndicator />
          ) : tags.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hashtags recorded yet — be the first.
            </ThemedText>
          ) : (
            <View style={styles.tagRow}>
              {tags.map((t) => (
                <Link key={t.tag} href={`/research/hashtags/${t.tag}`} asChild>
                  <Pressable style={styles.tagPill}>
                    <ThemedText type="small" style={styles.tagText}>
                      #{t.tag}  ·  {t.count}
                    </ThemedText>
                  </Pressable>
                </Link>
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
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#222',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryPill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryPillSel: {
    backgroundColor: '#00c1d1',
    borderColor: '#00c1d1',
  },
  categoryTextSel: {
    color: '#000',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    minWidth: 220,
    flexGrow: 1,
    flexBasis: 220,
    gap: Spacing.one,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tagPill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: '#003b41',
  },
  tagText: {
    color: '#7ee9f2',
  },
});
