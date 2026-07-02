import { supabase } from '@/lib/supabase/client';
import type { DiveSite } from '@/lib/types';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export interface SubmitSiteInput {
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  submitted_by: string;
}

export async function submitSite(input: SubmitSiteInput): Promise<DiveSite> {
  const base = slugify(input.name);
  const slug = base + '-' + Math.random().toString(36).slice(2, 6);

  const { data, error } = await supabase
    .from('dive_sites')
    .insert({
      slug,
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      description: input.description,
      submitted_by: input.submitted_by,
      is_verified: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DiveSite;
}
