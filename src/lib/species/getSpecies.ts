import { supabase } from '@/lib/supabase/client';
import type { Species, SpeciesCategory } from '@/lib/types';

export async function listSpecies(category?: SpeciesCategory): Promise<Species[]> {
  let q = supabase.from('species').select('*').eq('is_verified', true).order('common_name');
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Species[];
}

export async function getSpeciesBySlug(slug: string): Promise<Species | null> {
  const { data, error } = await supabase
    .from('species')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Species | null) ?? null;
}

export async function findSpeciesByTag(tag: string): Promise<Species | null> {
  // Normalized tag maps to slug (with underscores → hyphens)
  const slug = tag.toLowerCase().replace(/_/g, '-');
  return getSpeciesBySlug(slug);
}

export interface SubmitSpeciesInput {
  common_name: string;
  scientific_name: string;
  category: SpeciesCategory;
  description: string | null;
  submitted_by: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function submitSpecies(input: SubmitSpeciesInput): Promise<Species> {
  const slug = slugify(input.common_name) + '-' + Math.random().toString(36).slice(2, 5);
  const { data, error } = await supabase
    .from('species')
    .insert({
      slug,
      common_name: input.common_name,
      scientific_name: input.scientific_name,
      category: input.category,
      description: input.description,
      submitted_by: input.submitted_by,
      is_verified: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Species;
}

export async function listPendingSpecies(): Promise<Species[]> {
  const { data, error } = await supabase
    .from('species')
    .select('*')
    .eq('is_verified', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Species[];
}

export async function verifySpecies(id: string, isVerified: boolean): Promise<void> {
  const { error } = await supabase
    .from('species')
    .update({ is_verified: isVerified })
    .eq('id', id);
  if (error) throw error;
}
