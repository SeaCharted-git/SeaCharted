import type { Species } from '@/lib/types';

export interface BulkMatchResult {
  fileName: string;
  slug: string;
  species: Pick<Species, 'id' | 'slug' | 'common_name' | 'scientific_name'> | null;
}

/**
 * Convert a filename to a candidate species slug.
 * Strips extension, lowercases, replaces underscores/spaces with hyphens,
 * collapses runs of separators, and trims leading/trailing separators.
 */
export function fileNameToSlug(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '');
  return withoutExt
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Match a list of picked filenames against the species catalog by slug.
 * Files whose derived slug matches an existing species get `species` populated;
 * unmatched files come back with `species: null` so the caller can flag them.
 */
export function matchFilesToSpecies(
  fileNames: string[],
  species: Pick<Species, 'id' | 'slug' | 'common_name' | 'scientific_name'>[],
): BulkMatchResult[] {
  const bySlug = new Map(species.map((s) => [s.slug, s]));
  return fileNames.map((fileName) => {
    const slug = fileNameToSlug(fileName);
    return {
      fileName,
      slug,
      species: bySlug.get(slug) ?? null,
    };
  });
}
