import { supabase } from '@/lib/supabase/client';
import type { Dive, DiveSite } from '@/lib/types';

export interface DiveWithSite extends Dive {
  site: Pick<DiveSite, 'id' | 'slug' | 'name' | 'lat' | 'lng'> | null;
}

export async function listMyDives(userId: string): Promise<DiveWithSite[]> {
  const { data, error } = await supabase
    .from('dives')
    .select('*, site:dive_sites(id, slug, name, lat, lng)')
    .eq('user_id', userId)
    .order('dive_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DiveWithSite[];
}

export async function getDiveById(id: string): Promise<DiveWithSite | null> {
  const { data, error } = await supabase
    .from('dives')
    .select('*, site:dive_sites(id, slug, name, lat, lng)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as DiveWithSite | null) ?? null;
}

export interface CreateDiveInput {
  user_id: string;
  site_id: string;
  dive_date: string;
  max_depth_m: number | null;
  duration_min: number | null;
  buddy_name: string | null;
  notes: string | null;
  is_public: boolean;
  moon_phase?: number | null;
}

export async function createDive(input: CreateDiveInput): Promise<Dive> {
  const { data, error } = await supabase
    .from('dives')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Dive;
}

export async function updateDive(
  id: string,
  patch: Partial<Omit<Dive, 'id' | 'user_id' | 'created_at'>>,
): Promise<Dive> {
  const { data, error } = await supabase
    .from('dives')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Dive;
}

export async function deleteDive(id: string): Promise<void> {
  const { error } = await supabase.from('dives').delete().eq('id', id);
  if (error) throw error;
}
