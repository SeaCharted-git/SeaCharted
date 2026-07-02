import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { MapView } from '@/components/map-view';
import { ThemedView } from '@/components/themed-view';
import { getSites } from '@/lib/sites/getSites';
import type { DiveSite } from '@/lib/types';

export default function HomeScreen() {
  const [sites, setSites] = useState<DiveSite[]>([]);

  useEffect(() => {
    getSites().then(setSites);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <MapView sites={sites} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
