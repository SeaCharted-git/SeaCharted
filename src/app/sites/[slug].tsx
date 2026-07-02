import { Link, Stack, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchWeatherSample, type WeatherSample } from '@/lib/conditions/openMeteo';
import { SIGHTING_COUNT_OPTIONS } from '@/lib/profile/labels';
import { getRecentSightingsAtSite, type SiteRecentSighting } from '@/lib/research/queries';
import { getSiteBySlug, getSites } from '@/lib/sites/getSites';
import type { DiveSite } from '@/lib/types';

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  const sites = await getSites();
  return sites.map((s) => ({ slug: s.slug }));
}

export default function SitePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [site, setSite] = useState<DiveSite | null>(null);
  const [siteLoaded, setSiteLoaded] = useState(false);
  const [conditions, setConditions] = useState<WeatherSample | null>(null);
  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [sightings, setSightings] = useState<SiteRecentSighting[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    getSiteBySlug(slug).then((s) => {
      setSite(s);
      setSiteLoaded(true);
    });
  }, [slug]);

  useEffect(() => {
    if (!site) return;
    setConditionsError(null);
    fetchWeatherSample(site.lat, site.lng)
      .then(setConditions)
      .catch((err: unknown) =>
        setConditionsError(err instanceof Error ? err.message : 'Failed to load conditions'),
      );
    getRecentSightingsAtSite(site.id)
      .then(setSightings)
      .catch(() => setSightings([]));
  }, [site]);

  if (siteLoaded && !site) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default">Site not found.</ThemedText>
      </ThemedView>
    );
  }

  if (!site) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Loading…
        </ThemedText>
      </ThemedView>
    );
  }

  const pageTitle = `${site.name} — Cozumel dive site`;
  const pageDesc =
    site.description ??
    `Live surface conditions and dive info for ${site.name} on Cozumel, Mexico.`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
      </Head>
      <Stack.Screen options={{ title: site.name }} />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title">{site.name}</ThemedText>

          <ThemedView style={styles.metaRow}>
            {site.difficulty ? (
              <ThemedText type="small" themeColor="textSecondary">
                {site.difficulty}
              </ThemedText>
            ) : null}
            {site.max_depth_m ? (
              <ThemedText type="small" themeColor="textSecondary">
                · max {site.max_depth_m}m
              </ThemedText>
            ) : null}
            {site.site_type ? (
              <ThemedText type="small" themeColor="textSecondary">
                · {site.site_type}
              </ThemedText>
            ) : null}
          </ThemedView>

          {site.description ? (
            <ThemedText type="default" style={styles.desc}>
              {site.description}
            </ThemedText>
          ) : null}

          <ThemedView type="backgroundElement" style={styles.conditionsCard}>
            <ThemedText type="subtitle">Current surface conditions</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Modeled data · not for dive planning
            </ThemedText>

            {conditionsError ? (
              <ThemedText type="small">Unable to load: {conditionsError}</ThemedText>
            ) : !conditions ? (
              <ThemedText type="small" themeColor="textSecondary">
                Loading…
              </ThemedText>
            ) : (
              <>
                <ConditionRow
                  label="Wind"
                  value={
                    conditions.wind_kts !== null
                      ? `${conditions.wind_kts.toFixed(1)} kn ${degToCardinal(conditions.wind_dir_deg)}`
                      : '—'
                  }
                />
                <ConditionRow
                  label="Air"
                  value={
                    conditions.air_temp_c !== null
                      ? `${conditions.air_temp_c.toFixed(1)}°C`
                      : '—'
                  }
                />
                <ConditionRow
                  label="Water"
                  value={
                    conditions.water_temp_c !== null
                      ? `${conditions.water_temp_c.toFixed(1)}°C`
                      : '—'
                  }
                />
                <ConditionRow
                  label="Swell"
                  value={
                    conditions.swell_m !== null
                      ? `${conditions.swell_m.toFixed(2)}m @ ${conditions.swell_period_s?.toFixed(1) ?? '—'}s`
                      : '—'
                  }
                />
              </>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.conditionsCard}>
            <ThemedText type="subtitle">Recent sightings</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              From public dive logs at this site.
            </ThemedText>
            {sightings === null ? (
              <ThemedText type="small" themeColor="textSecondary">Loading…</ThemedText>
            ) : sightings.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No public sightings yet — be the first to log one.
              </ThemedText>
            ) : (
              <View style={styles.sightList}>
                {sightings.slice(0, 10).map((s) => (
                  <View key={s.id} style={styles.sightRow}>
                    <View style={{ flex: 1 }}>
                      {s.species ? (
                        <Link href={`/research/species/${s.species.slug}`} asChild>
                          <ThemedText type="link">{s.species.common_name}</ThemedText>
                        </Link>
                      ) : (
                        <ThemedText type="default">Unknown</ThemedText>
                      )}
                      <ThemedText type="small" themeColor="textSecondary">
                        {s.species?.scientific_name}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {SIGHTING_COUNT_OPTIONS.find((c) => c.value === s.count_bucket)?.label ?? s.count_bucket}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}

function ConditionRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.condRow}>
      <ThemedText type="default">{label}</ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </ThemedView>
  );
}

function degToCardinal(deg: number | null): string {
  if (deg === null) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((deg % 360) / 45) % 8];
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
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  desc: {
    marginTop: Spacing.two,
  },
  conditionsCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  condRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  sightList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.two,
  },
});
