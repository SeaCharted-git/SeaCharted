import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { DiveSite } from '@/lib/types';

export interface MapViewProps {
  sites: DiveSite[];
}

export function MapView({ sites }: MapViewProps) {
  return (
    <ThemedView style={styles.placeholder}>
      <ThemedText type="subtitle">Map view</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {sites.length} site{sites.length === 1 ? '' : 's'} · Native map coming in v2.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
