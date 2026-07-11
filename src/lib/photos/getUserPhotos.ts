import { supabase } from '@/lib/supabase/client';
import type { DivePhoto } from '@/lib/types';

export interface UserPhoto extends DivePhoto {
  dives: {
    id: string;
    dive_date: string;
    site_id: string;
    dive_sites: { name: string } | null;
  };
}

export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  const { data, error } = await supabase
    .from('dive_photos')
    .select('*, dives!inner(id, dive_date, site_id, dive_sites(name))')
    .eq('dives.user_id', userId)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as unknown as UserPhoto[];
  // Secondary sort: taken_at first (already server-sorted), then dive_date desc for nulls.
  return rows.sort((a, b) => {
    if (a.taken_at && b.taken_at) return 0;
    if (a.taken_at) return -1;
    if (b.taken_at) return 1;
    return b.dives.dive_date.localeCompare(a.dives.dive_date);
  });
}
