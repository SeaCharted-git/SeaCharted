import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import RNMapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import type { DiveSite } from '@/lib/types';

export interface MapViewProps {
  sites: DiveSite[];
}

const COZUMEL_REGION = {
  latitude: 20.42,
  longitude: -86.95,
  latitudeDelta: 0.35,
  longitudeDelta: 0.25,
};

const MARKER_COLOR = '#00c1d1';

export function MapView({ sites }: MapViewProps) {
  const router = useRouter();

  const initialRegion = useMemo(() => COZUMEL_REGION, []);

  return (
    <View style={styles.container}>
      <RNMapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="hybrid"
        showsCompass
        showsScale
      >
        {sites.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.name}
            description={s.difficulty ?? undefined}
            pinColor={MARKER_COLOR}
            onCalloutPress={() =>
              router.push({ pathname: '/sites/[slug]', params: { slug: s.slug } })
            }
          />
        ))}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
