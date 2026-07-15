/**
 * §3 spec: keyword categories map to the 7 species groups (marine plants, sponges, corals,
 * invertebrates, fish, sea turtles, marine mammals).
 *
 * This test parses the seed SQL directly and verifies structural invariants of the seeded
 * Cozumel species catalog — every row has a slug, common_name, scientific_name, and a
 * category ∈ {7 spec keywords}.
 */
import fs from 'node:fs';
import path from 'node:path';

const SEED_PATH = path.join(__dirname, '20260702000005_seed_species.sql');

const VALID_CATEGORIES = new Set([
  'marine_plant',
  'sponge',
  'coral',
  'invertebrate',
  'fish',
  'sea_turtle',
  'marine_mammal',
]);

interface SeedRow {
  slug: string;
  common_name: string;
  scientific_name: string;
  category: string;
  source_reference: string;
  is_verified: string;
}

function parseSeedRows(sql: string): SeedRow[] {
  const rows: SeedRow[] = [];
  // Match tuples: ('slug','common','scientific','category','source','is_verified')
  const tuple = /\(\s*'([^']+)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(true|false)\s*\)/g;
  let m;
  while ((m = tuple.exec(sql)) !== null) {
    rows.push({
      slug: m[1],
      common_name: m[2],
      scientific_name: m[3],
      category: m[4],
      source_reference: m[5],
      is_verified: m[6],
    });
  }
  return rows;
}

const sql = fs.readFileSync(SEED_PATH, 'utf-8');
const rows = parseSeedRows(sql);

describe('seed_species.sql — §3 species catalog invariants', () => {
  test('parsed at least 100 species from the seed', () => {
    expect(rows.length).toBeGreaterThan(100);
  });

  test('every row has a non-empty slug', () => {
    for (const r of rows) {
      expect(r.slug.length).toBeGreaterThan(0);
      expect(r.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test('every row has a non-empty common_name', () => {
    for (const r of rows) {
      expect(r.common_name.trim().length).toBeGreaterThan(0);
    }
  });

  test('every row has a non-empty scientific_name', () => {
    for (const r of rows) {
      expect(r.scientific_name.trim().length).toBeGreaterThan(0);
    }
  });

  test('every row has a category from the 7 spec keywords', () => {
    for (const r of rows) {
      expect(VALID_CATEGORIES.has(r.category)).toBe(true);
    }
  });

  test('each of the 7 categories has at least one seeded species', () => {
    const seen = new Set(rows.map((r) => r.category));
    for (const cat of VALID_CATEGORIES) {
      expect(seen.has(cat)).toBe(true);
    }
  });

  test('slugs are unique across the seed', () => {
    const slugs = rows.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('sponges category has non-trivial count (spec keyword: sponges)', () => {
    expect(rows.filter((r) => r.category === 'sponge').length).toBeGreaterThan(5);
  });

  test('fish category has substantial count (Caribbean has hundreds of species)', () => {
    expect(rows.filter((r) => r.category === 'fish').length).toBeGreaterThan(20);
  });

  test('sea turtles and marine mammals are present (both small but essential)', () => {
    expect(rows.filter((r) => r.category === 'sea_turtle').length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.category === 'marine_mammal').length).toBeGreaterThan(0);
  });

  test('every row is marked verified (seed is authoritative)', () => {
    for (const r of rows) {
      expect(r.is_verified).toBe('true');
    }
  });

  test('source references Caribbean Reef Life (§3 spec source)', () => {
    for (const r of rows) {
      expect(r.source_reference).toContain('Caribbean Reef Life');
    }
  });
});
