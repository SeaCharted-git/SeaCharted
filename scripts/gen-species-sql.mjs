import fs from 'node:fs';

const auto = JSON.parse(fs.readFileSync('tmp/species_pairs.json', 'utf8'));

// Hand-curated additions for Cozumel-priority species missing from the scripted extract
// (mostly sea turtles + marine mammals, plus a few of the highest-encountered species).
const manual = [
  { slug: 'green-sea-turtle', common_name: 'Green Sea Turtle', scientific_name: 'Chelonia mydas', category: 'sea_turtle' },
  { slug: 'hawksbill-sea-turtle', common_name: 'Hawksbill Sea Turtle', scientific_name: 'Eretmochelys imbricata', category: 'sea_turtle' },
  { slug: 'loggerhead-sea-turtle', common_name: 'Loggerhead Sea Turtle', scientific_name: 'Caretta caretta', category: 'sea_turtle' },
  { slug: 'leatherback-sea-turtle', common_name: 'Leatherback Sea Turtle', scientific_name: 'Dermochelys coriacea', category: 'sea_turtle' },
  { slug: 'bottlenose-dolphin', common_name: 'Bottlenose Dolphin', scientific_name: 'Tursiops truncatus', category: 'marine_mammal' },
  { slug: 'atlantic-spotted-dolphin', common_name: 'Atlantic Spotted Dolphin', scientific_name: 'Stenella frontalis', category: 'marine_mammal' },
  { slug: 'west-indian-manatee', common_name: 'West Indian Manatee', scientific_name: 'Trichechus manatus', category: 'marine_mammal' },
  { slug: 'nurse-shark', common_name: 'Nurse Shark', scientific_name: 'Ginglymostoma cirratum', category: 'fish' },
  { slug: 'caribbean-reef-shark', common_name: 'Caribbean Reef Shark', scientific_name: 'Carcharhinus perezii', category: 'fish' },
  { slug: 'southern-stingray', common_name: 'Southern Stingray', scientific_name: 'Hypanus americanus', category: 'fish' },
  { slug: 'spotted-eagle-ray', common_name: 'Spotted Eagle Ray', scientific_name: 'Aetobatus narinari', category: 'fish' },
  { slug: 'splendid-toadfish', common_name: 'Splendid Toadfish', scientific_name: 'Sanopus splendidus', category: 'fish' },
  { slug: 'queen-angelfish', common_name: 'Queen Angelfish', scientific_name: 'Holacanthus ciliaris', category: 'fish' },
  { slug: 'french-angelfish', common_name: 'French Angelfish', scientific_name: 'Pomacanthus paru', category: 'fish' },
  { slug: 'stoplight-parrotfish', common_name: 'Stoplight Parrotfish', scientific_name: 'Sparisoma viride', category: 'fish' },
  { slug: 'green-moray', common_name: 'Green Moray', scientific_name: 'Gymnothorax funebris', category: 'fish' },
  { slug: 'spotted-moray', common_name: 'Spotted Moray', scientific_name: 'Gymnothorax moringa', category: 'fish' },
  { slug: 'goliath-grouper', common_name: 'Goliath Grouper', scientific_name: 'Epinephelus itajara', category: 'fish' },
  { slug: 'lionfish-invasive', common_name: 'Red Lionfish', scientific_name: 'Pterois volitans', category: 'fish' },
];

// Merge — dedup by scientific_name; manual entries win.
const bySci = new Map();
for (const row of auto) {
  bySci.set(row.scientific_name.toLowerCase(), row);
}
for (const row of manual) {
  bySci.set(row.scientific_name.toLowerCase(), row);
}
const all = [...bySci.values()];

// Escape single quotes for SQL literals.
const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

const REF = 'Caribbean Reef Life (Mickey Charteris, 3rd ed) — names only';
const lines = all.map(
  (r) =>
    `(${q(r.slug)}, ${q(r.common_name)}, ${q(r.scientific_name)}, ${q(r.category)}, ${q(REF)}, true)`,
);

const sql = `-- Seed Cozumel species catalog.
-- Common+scientific names cross-referenced from Caribbean Reef Life (Charteris 3rd ed).
-- Descriptions are intentionally null; app authors originate copy per licensing decision.

insert into public.species (slug, common_name, scientific_name, category, source_reference, is_verified)
values
${lines.join(',\n')}
on conflict (scientific_name) do update set
  common_name = excluded.common_name,
  category = excluded.category,
  source_reference = excluded.source_reference,
  is_verified = true;
`;

fs.writeFileSync('supabase/migrations/20260702000005_seed_species.sql', sql);
console.log('wrote species migration with', all.length, 'rows');
`;
`;
