import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { publicUrl } from '@/lib/photos/upload';
import { getUserPhotos, type UserPhoto } from '@/lib/photos/getUserPhotos';

export default function GalleryScreen() {
  return (
    <AuthGuard>
      <Gallery />
    </AuthGuard>
  );
}

function Gallery() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<UserPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserPhotos(user.id)
      .then((rows) => {
        if (!cancelled) setPhotos(rows);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }
  if (photos === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (photos.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">No photos yet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Log a dive and attach photos to see them collected here.
        </ThemedText>
        <Link href="/dives/new" asChild>
          <Pressable style={inputStyles.primaryButton}>
            <ThemedText type="default" style={inputStyles.primaryButtonText}>
              Log a dive
            </ThemedText>
          </Pressable>
        </Link>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText type="title">Gallery</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {photos.length} photo{photos.length === 1 ? '' : 's'} across all your dives.
            Tap a tile to open its dive.
          </ThemedText>
        </View>
        <View style={styles.grid}>
          {photos.map((p) => (
            <Link key={p.id} href={`/dives/${p.dives.id}`} asChild>
              <Pressable style={styles.tile}>
                <Image
                  source={{ uri: publicUrl(p.storage_path) }}
                  style={styles.image}
                  contentFit="cover"
                />
                <View style={styles.caption}>
                  <ThemedText type="small" numberOfLines={1}>
                    {p.dives.dive_sites?.name ?? 'Unknown site'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {p.dives.dive_date}
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          ))}
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
    gap: Spacing.three,
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    gap: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: 160,
    gap: Spacing.one,
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: Spacing.two,
    backgroundColor: '#222',
  },
  caption: {
    gap: 2,
  },
});
