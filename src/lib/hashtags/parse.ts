import { supabase } from '@/lib/supabase/client';

// Match #word_or_snake_case_tag — letters, digits, underscores, hyphens.
const HASHTAG_RE = /#([a-z][a-z0-9_-]{1,64})/gi;

export function parseHashtags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(HASHTAG_RE)) {
    const tag = m[1].toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

// Given a hashtag, try to link it to a species by (a) slug match, (b) slug match with underscores → hyphens.
export async function resolveTagToSpeciesId(tag: string): Promise<string | null> {
  const slugCandidates = [tag, tag.replace(/_/g, '-'), tag.replace(/-/g, '_')];
  const { data, error } = await supabase
    .from('species')
    .select('id')
    .in('slug', slugCandidates)
    .limit(1);
  if (error) return null;
  return data && data.length > 0 ? (data[0] as { id: string }).id : null;
}

export async function syncHashtagsForObservation(observationId: string, text: string): Promise<void> {
  const tags = parseHashtags(text);
  await supabase.from('hashtag_mentions').delete().eq('observation_id', observationId);
  if (tags.length === 0) return;
  const rows = await Promise.all(
    tags.map(async (tag) => ({
      observation_id: observationId,
      tag,
      species_id: await resolveTagToSpeciesId(tag),
    })),
  );
  const { error } = await supabase.from('hashtag_mentions').insert(rows);
  if (error) throw error;
}
