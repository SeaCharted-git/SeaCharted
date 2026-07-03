import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'expo-router';
import mapboxgl from 'mapbox-gl';
import { useCallback, useEffect, useRef } from 'react';

import { env } from '@/lib/env';
import type { DiveSite } from '@/lib/types';

export interface MapViewProps {
  sites: DiveSite[];
}

const COZUMEL_CENTER: [number, number] = [-86.95, 20.42];
const DEFAULT_ZOOM = 10.5;
const MARKER_COLOR = '#00c1d1';

export function MapView({ sites }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const goToSite = useCallback(
    (slug: string) => {
      router.push({ pathname: '/sites/[slug]', params: { slug } });
    },
    [router],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = env().mapboxToken;
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: COZUMEL_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    const markers: mapboxgl.Marker[] = [];

    map.on('load', () => {
      map.addSource('dive-site-labels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: sites.map((s) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            properties: { name: s.name },
          })),
        },
      });

      map.addLayer({
        id: 'dive-site-labels',
        type: 'symbol',
        source: 'dive-site-labels',
        minzoom: 11,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 11,
            14, 13,
            18, 16,
          ],
          'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
          'text-radial-offset': 1.1,
          'text-justify': 'auto',
          'text-max-width': 8,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 3,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.85)',
          'text-halo-width': 1.5,
        },
      });

      for (const site of sites) {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', site.name);
        el.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: ${MARKER_COLOR}; border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4); cursor: pointer;
          padding: 0; display: block;
        `;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          goToSite(site.slug);
        });
        const marker = new mapboxgl.Marker(el)
          .setLngLat([site.lng, site.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<strong>${site.name}</strong>${
                site.difficulty ? `<br/><em>${site.difficulty}</em>` : ''
              }`,
            ),
          )
          .addTo(map);
        markers.push(marker);
      }
    });

    return () => {
      for (const m of markers) m.remove();
      map.remove();
    };
  }, [sites, goToSite]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 480,
      }}
    />
  );
}
