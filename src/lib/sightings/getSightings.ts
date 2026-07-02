import { supabase } from '@/lib/supabase/client';
import type { Sighting, SightingCount } from '@/lib/types';

export interface SightingWithSpecies extends Sighting {
  species: {
    id: string;
    slug: string;
    common_name: string;
    scientific_name: string;
    category: string;
  } | null;
}

export async function listSightingsForDive(diveId: string): Promise<SightingWithSpecies[]> {
  const { data, error } = await supabase
    .from('sightings')
    .select('*, species(id, slug, common_name, scientific_name, category)')
    .eq('dive_id', diveId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SightingWithSpecies[];
}

export interface CreateSightingInput {
  dive_id: string;
  species_id: string;
  count_bucket: SightingCount;
  note: string | null;
}

export async function upsertSighting(input: CreateSightingInput): Promise<Sighting> {
  const { data, error } = await supabase
    .from('sightings')
    .upsert(input, { onConflict: 'dive_id,species_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Sighting;
}

export async function deleteSighting(id: string): Promise<void> {
  const { error } = await supabase.from('sightings').delete().eq('id', id);
  if (error) throw error;
}
