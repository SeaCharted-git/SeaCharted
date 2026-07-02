import { supabase } from '@/lib/supabase/client';
import type { DiveSite } from '@/lib/types';

import { cozumelSeed } from './seed-cozumel';

export async function getSites(): Promise<DiveSite[]> {
  try {
    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .order('name');
    if (error) throw error;
    if (data && data.length > 0) return data as DiveSite[];
  } catch (err) {
    console.warn('[getSites] Supabase unavailable, using local seed:', err);
  }
  return cozumelSeed;
}

export async function getSiteBySlug(slug: string): Promise<DiveSite | null> {
  try {
    const { data, error } = await supabase
      .from('dive_sites')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as DiveSite;
  } catch (err) {
    console.warn(`[getSiteBySlug ${slug}] Supabase unavailable, using local seed:`, err);
  }
  return cozumelSeed.find((s) => s.slug === slug) ?? null;
}
