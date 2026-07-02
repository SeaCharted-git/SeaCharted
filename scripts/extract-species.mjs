import fs from 'node:fs';
import path from 'node:path';

// Parse the two index files extracted from the field guide.
// Common-name index is grouped by category header lines; scientific-name index is not (we assume same page ranges).
// Output: JSON array of { common_name, scientific_name, category, page }

const CATEGORY_MAP = {
  'MARINE PLANTS': 'marine_plant',
  SPONGES: 'sponge',
  CORALS: 'coral',
  INVERTEBRATES: 'invertebrate',
  FISHES: 'fish',
  'SEA TURTLES': 'sea_turtle',
  'MARINE MAMMALS': 'marine_mammal',
};

const CATEGORY_PAGE_RANGES = [
  // Derived from FIND IT FAST index (front matter) — approximate page ranges per category.
  ['marine_plant', 8, 41],
  ['sponge', 42, 67],
  ['coral', 68, 99],
  ['invertebrate', 100, 245],
  ['fish', 246, 385],
  ['sea_turtle', 386, 387],
  ['marine_mammal', 388, 389],
];

function categoryForPage(page) {
  for (const [cat, lo, hi] of CATEGORY_PAGE_RANGES) {
    if (page >= lo && page <= hi) return cat;
  }
  return null;
}

// Each index page line often has two columns. We just extract lines, then find all
//   "Word, page" or "Word Word, page" style tokens.
// Format observed in the scientific-name index (page-column layout):
//   "Acetabularia caliculus, 16"
//   " crenulata, 16"                <- indented continuation, same genus as previous line
//   "Amphiroa brasiliana, 33"
//
// A line like " crenulata, 16" means Acetabularia crenulata.

function parseSciIndex(text) {
  const rows = [];
  const lines = text.split('\n');
  let currentGenus = null;

  for (const rawLine of lines) {
    // Split into potential two-column halves at 2+ spaces of separation.
    const parts = rawLine.split(/\s{3,}/g).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^([A-Za-z][A-Za-z\-.' ]*?),\s*(\d{1,3})$/);
      if (!m) continue;
      const namePart = m[1].trim();
      const page = parseInt(m[2], 10);
      if (page < 1 || page > 420) continue;

      let scientific;
      if (/^[A-Z]/.test(namePart) && namePart.split(' ').length >= 2) {
        // Full genus + species (or with variety marker)
        scientific = namePart;
        currentGenus = namePart.split(' ')[0];
      } else if (/^[A-Z]/.test(namePart)) {
        // Genus alone — unusual for species list
        continue;
      } else {
        if (!currentGenus) continue;
        scientific = `${currentGenus} ${namePart}`;
      }

      if (scientific.toLowerCase().includes('sp.')) continue;
      const cat = categoryForPage(page);
      rows.push({ scientific_name: scientific.replace(/\s+/g, ' ').trim(), page, category: cat });
    }
  }
  return rows;
}

// Common-name index has category headers ("MARINE PLANTS:", "SPONGES:", etc.)
// Rows are also indented continuations of the prior "top-level" common name.
function parseCommonIndex(text) {
  const rows = [];
  const lines = text.split('\n');
  let currentCategory = null;
  let currentGroup = null; // e.g., "Grape Alga" when subsequent lines have variants

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    // Category header
    const catMatch = trimmed.match(/^([A-Z][A-Z ]+):\s*$/);
    if (catMatch && CATEGORY_MAP[catMatch[1]]) {
      currentCategory = CATEGORY_MAP[catMatch[1]];
      currentGroup = null;
      continue;
    }
    const parts = rawLine.split(/\s{3,}/g).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      // "Sargassum, Sargasso Weed, 25" — group Sargassum, variant Sargasso Weed
      // "Angelfish, Queen, 304"
      // "Angelfish, French, 304"
      // " Blade Alga, Balled, 21"
      // " Cemented, 19"       (variant of previous group "Blade Alga")
      // "Green Bubble Weed, 19"
      const m = part.match(/^(.+?),\s*(\d{1,3})$/);
      if (!m) continue;
      const namePart = m[1].trim();
      const page = parseInt(m[2], 10);
      if (page < 1 || page > 420) continue;

      // Determine group / variant handling.
      // If the name contains a comma "Sargassum, Sargasso Weed" — group=Sargassum, variant=rest.
      const partsInName = namePart.split(',').map((s) => s.trim()).filter(Boolean);
      let common;
      if (partsInName.length >= 2) {
        currentGroup = partsInName[0];
        common = `${partsInName[1]} ${partsInName[0]}`;
      } else if (/^[a-z]/.test(namePart) && currentGroup) {
        // indented variant of the previous group
        common = `${namePart} ${currentGroup}`;
      } else {
        common = namePart;
        currentGroup = namePart;
      }
      const cat = currentCategory ?? categoryForPage(page);
      if (!cat) continue;
      rows.push({ common_name: common.replace(/\s+/g, ' ').trim(), page, category: cat });
    }
  }
  return rows;
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const sciText = fs.readFileSync(path.join('tmp', 'carib_index.txt'), 'utf8');
  const commonText = fs.readFileSync(path.join('tmp', 'carib_common_idx.txt'), 'utf8');

  const sci = parseSciIndex(sciText);
  const common = parseCommonIndex(commonText);

  // Bucket by (page, category)
  const sciByPage = new Map();
  for (const s of sci) {
    const key = s.page;
    if (!sciByPage.has(key)) sciByPage.set(key, []);
    sciByPage.get(key).push(s);
  }

  const paired = [];
  const orphanCommon = [];
  for (const c of common) {
    const candidates = sciByPage.get(c.page) ?? [];
    const compatible = candidates.filter((s) => s.category === c.category);
    if (compatible.length === 1) {
      paired.push({
        common_name: c.common_name,
        scientific_name: compatible[0].scientific_name,
        category: c.category,
        page: c.page,
      });
    } else if (compatible.length > 1) {
      // Ambiguous — record first compatible for MVP, tag as ambiguous
      paired.push({
        common_name: c.common_name,
        scientific_name: compatible[0].scientific_name,
        category: c.category,
        page: c.page,
        ambiguous: true,
      });
    } else {
      orphanCommon.push(c);
    }
  }

  const uniq = new Map();
  for (const row of paired) {
    const key = row.scientific_name.toLowerCase();
    if (!uniq.has(key)) uniq.set(key, row);
  }
  const finalRows = [...uniq.values()].map((r) => ({
    slug: slugify(r.common_name),
    common_name: r.common_name,
    scientific_name: r.scientific_name,
    category: r.category,
  }));

  // Dedup slugs
  const slugSeen = new Map();
  for (const row of finalRows) {
    const base = row.slug;
    let candidate = base;
    let n = 2;
    while (slugSeen.has(candidate)) {
      candidate = `${base}-${n++}`;
    }
    slugSeen.set(candidate, true);
    row.slug = candidate;
  }

  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/species_pairs.json', JSON.stringify(finalRows, null, 2));
  fs.writeFileSync('tmp/orphan_common.json', JSON.stringify(orphanCommon, null, 2));
  console.log(`sci=${sci.length}  common=${common.length}  paired=${finalRows.length}  orphans=${orphanCommon.length}`);
  const byCat = {};
  for (const r of finalRows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  console.log('by category:', byCat);
}

main();
