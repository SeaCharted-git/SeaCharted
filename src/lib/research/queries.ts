import { supabase } from '@/lib/supabase/client';
import type { Sighting, Species } from '@/lib/types';

export interface PublicSighting {
  id: string;
  dive_id: string;
  count_bucket: string;
  note: string | null;
  created_at: string;
  dive: {
    id: string;
    dive_date: string;
    site_id: string;
    is_public: boolean;
    site: { id: string; slug: string; name: string; lat: number; lng: number } | null;
  } | null;
}

export async function getSightingsForSpecies(speciesId: string): Promise<PublicSighting[]> {
  const { data, error } = await supabase
    .from('sightings')
    .select(
      '*, dive:dives!inner(id, dive_date, site_id, is_public, site:dive_sites(id, slug, name, lat, lng))',
    )
    .eq('species_id', speciesId)
    .eq('dive.is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as PublicSighting[];
}

export interface PublicObservation {
  id: string;
  bucket: string;
  description: string;
  created_at: string;
  dive: {
    id: string;
    dive_date: string;
    site: { id: string; slug: string; name: string } | null;
  } | null;
}

export async function getObservationsForTag(tag: string): Promise<PublicObservation[]> {
  const { data, error } = await supabase
    .from('hashtag_mentions')
    .select(
      `observation:observations!inner(
        id, bucket, description, created_at,
        dive:dives!inner(id, dive_date, is_public, site:dive_sites(id, slug, name))
      )`,
    )
    .eq('tag', tag)
    .eq('observation.dive.is_public', true)
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { observation: PublicObservation }[];
  return rows.map((r) => r.observation).filter(Boolean);
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getTopHashtags(limit = 30): Promise<TagCount[]> {
  const { data, error } = await supabase
    .from('hashtag_mentions')
    .select('tag')
    .limit(2000);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { tag: string }[]) {
    counts.set(row.tag, (counts.get(row.tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface SiteRecentSighting {
  id: string;
  count_bucket: string;
  created_at: string;
  species: {
    id: string;
    slug: string;
    common_name: string;
    scientific_name: string;
    primary_photo_path: string | null;
  } | null;
}

export async function getRecentSightingsAtSite(siteId: string): Promise<SiteRecentSighting[]> {
  const { data, error } = await supabase
    .from('sightings')
    .select(
      '*, dive:dives!inner(id, site_id, is_public), species(id, slug, common_name, scientific_name, species_photos(storage_path, is_primary))',
    )
    .eq('dive.site_id', siteId)
    .eq('dive.is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  type Raw = {
    id: string;
    count_bucket: string;
    created_at: string;
    species: {
      id: string;
      slug: string;
      common_name: string;
      scientific_name: string;
      species_photos: { storage_path: string; is_primary: boolean }[];
    } | null;
  };
  return (data ?? []).map((row: unknown) => {
    const r = row as Raw;
    if (!r.species) return { id: r.id, count_bucket: r.count_bucket, created_at: r.created_at, species: null };
    const primary = r.species.species_photos?.find((p) => p.is_primary) ?? null;
    return {
      id: r.id,
      count_bucket: r.count_bucket,
      created_at: r.created_at,
      species: {
        id: r.species.id,
        slug: r.species.slug,
        common_name: r.species.common_name,
        scientific_name: r.species.scientific_name,
        primary_photo_path: primary?.storage_path ?? null,
      },
    };
  });
}
