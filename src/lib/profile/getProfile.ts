import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export type ProfileUpdate = Partial<
  Omit<Profile, 'id' | 'is_admin'>
>;

export async function updateProfile(
  userId: string,
  patch: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function countAppDives(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('dives')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}
