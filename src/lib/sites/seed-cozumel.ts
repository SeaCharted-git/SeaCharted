import type { DiveSite } from '@/lib/types';

// Placeholder seed — will be replaced with the full curated list.
// For local development before Supabase is provisioned, `id` uses the slug
// as a stable string; Supabase will assign real UUIDs when we seed.
export const cozumelSeed: DiveSite[] = [
  {
    id: 'palancar-gardens',
    slug: 'palancar-gardens',
    name: 'Palancar Gardens',
    lat: 20.372,
    lng: -87.028,
    description:
      'The northernmost of the Palancar sites. A sloping garden of coral formations and swim-throughs, popular with beginners and photographers.',
    difficulty: 'beginner',
    max_depth_m: 24,
    site_type: 'reef',
    created_at: new Date().toISOString(),
  },
];
