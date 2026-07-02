import { supabase } from '@/lib/supabase/client';
import { syncHashtagsForObservation } from '@/lib/hashtags/parse';
import type { Observation, ObservationBucket } from '@/lib/types';

export async function listObservationsForDive(diveId: string): Promise<Observation[]> {
  const { data, error } = await supabase
    .from('observations')
    .select('*')
    .eq('dive_id', diveId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Observation[];
}

export interface CreateObservationInput {
  dive_id: string;
  bucket: ObservationBucket;
  description: string;
  photo_id: string | null;
}

export async function createObservation(input: CreateObservationInput): Promise<Observation> {
  const { data, error } = await supabase
    .from('observations')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Observation;
  await syncHashtagsForObservation(row.id, row.description);
  return row;
}

export async function updateObservation(
  id: string,
  patch: Partial<Pick<Observation, 'bucket' | 'description' | 'photo_id'>>,
): Promise<Observation> {
  const { data, error } = await supabase
    .from('observations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Observation;
  if (patch.description !== undefined) {
    await syncHashtagsForObservation(row.id, row.description);
  }
  return row;
}

export async function deleteObservation(id: string): Promise<void> {
  const { error } = await supabase.from('observations').delete().eq('id', id);
  if (error) throw error;
}
