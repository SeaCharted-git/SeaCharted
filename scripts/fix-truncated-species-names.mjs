#!/usr/bin/env node
/**
 * Fix truncated species common_names using iNaturalist as the source of truth.
 *
 * Some seed rows have single-word or otherwise-clipped common_names (e.g.
 * common_name="Brown" for Pomatostegus grandis — probably "Brown Tube Worm"
 * cut off during PDF extraction). This script:
 *
 *   1. Loads every verified species
 *   2. For each with a suspiciously-short common_name (1–2 words), queries
 *      iNaturalist for the canonical taxon by scientific_name
 *   3. If iNat has a longer preferred_common_name AND its taxon.name matches
 *      the scientific_name exactly, proposes an update
 *   4. Dry-run by default; --apply writes the updates
 *
 * Requires:
 *   - EXPO_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/fix-truncated-species-names.mjs             # dry-run
 *   node scripts/fix-truncated-species-names.mjs --apply     # write changes
 *   node scripts/fix-truncated-species-names.mjs --limit 10  # first 10 only
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotEnv(resolve(__dirname, '..', '.env'));

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UA = 'SeaCharted-CommonNameFix/1.0 (https://sea-charted.vercel.app)';
const RATE_LIMIT_MS = 200; // iNat is happy with 5 req/s
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function inatCanonicalName(scientificName) {
  const url = new URL('https://api.inaturalist.org/v1/taxa');
  url.searchParams.set('q', scientificName);
  url.searchParams.set('rank', 'species');
  url.searchParams.set('per_page', '5');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  // Only accept results whose taxon.name EXACTLY matches the queried scientific
  // name — iNat's search is fuzzy and can return unrelated taxa first.
  const match = (json.results ?? []).find(
    (t) => (t.name ?? '').toLowerCase() === scientificName.toLowerCase(),
  );
  if (!match) return null;
  const name = match.preferred_common_name;
  if (!name || typeof name !== 'string') return null;
  return name.trim();
}

function isSuspiciouslyShort(commonName) {
  const trimmed = commonName?.trim() ?? '';
  if (!trimmed) return true;
  // 1-word names are the main red flag (species almost always have 2+ word
  // common names). 2 short words also worth checking (e.g. "Brown Fish").
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return true;
  if (words.length === 2 && trimmed.length <= 10) return true;
  return false;
}

function isProposedBetter(current, proposed) {
  if (!proposed) return false;
  if (proposed.toLowerCase() === current.toLowerCase()) return false;
  // Reject if iNat's name is shorter than current — probably a downgrade.
  if (proposed.length <= current.length) return false;
  // Reject if iNat's name doesn't include (case-insensitive) the current as
  // a word — usually means iNat picked a totally different vernacular.
  const curLower = current.toLowerCase();
  const propLower = proposed.toLowerCase();
  if (!propLower.includes(curLower)) return false;
  return true;
}

async function main() {
  console.log(`\n== Species common_name cleanup ${APPLY ? '(APPLY)' : '(dry run)'} ==`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  const { data: allSp, error } = await supabase
    .from('species')
    .select('id, slug, common_name, scientific_name')
    .eq('is_verified', true)
    .order('common_name');
  if (error) throw new Error(`species list: ${error.message}`);

  let candidates = (allSp ?? []).filter((s) => isSuspiciouslyShort(s.common_name));
  console.log(`Suspiciously-short common_names: ${candidates.length} of ${allSp.length}`);
  if (LIMIT !== null) {
    candidates = candidates.slice(0, LIMIT);
    console.log(`--limit ${LIMIT} → processing ${candidates.length}\n`);
  } else {
    console.log('');
  }

  const width = String(candidates.length).length;
  const changes = [];
  const skipped = [];

  for (let i = 0; i < candidates.length; i++) {
    const sp = candidates[i];
    const n = String(i + 1).padStart(width, ' ');
    let proposed = null;
    try {
      proposed = await inatCanonicalName(sp.scientific_name);
    } catch (e) {
      console.log(`[${n}/${candidates.length}] ! ${sp.slug} — iNat lookup failed: ${e.message}`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    if (proposed && isProposedBetter(sp.common_name, proposed)) {
      changes.push({ id: sp.id, slug: sp.slug, from: sp.common_name, to: proposed, scientific: sp.scientific_name });
      console.log(`[${n}/${candidates.length}] ✓ ${sp.slug}: "${sp.common_name}" → "${proposed}"`);
    } else {
      skipped.push({ slug: sp.slug, current: sp.common_name, inat: proposed, scientific: sp.scientific_name });
      console.log(`[${n}/${candidates.length}] – ${sp.slug}: kept "${sp.common_name}" (iNat: ${proposed ?? 'no match'})`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n== Summary ==`);
  console.log(`Candidates checked: ${candidates.length}`);
  console.log(`Proposed changes:   ${changes.length}`);
  console.log(`Kept as-is:         ${skipped.length}`);

  if (!APPLY) {
    console.log(`\n(dry run — re-run with --apply to write the ${changes.length} change(s))`);
    return;
  }

  if (changes.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  console.log(`\nApplying ${changes.length} update(s)…`);
  let ok = 0;
  let fail = 0;
  for (const c of changes) {
    const { error: uErr } = await supabase
      .from('species')
      .update({ common_name: c.to })
      .eq('id', c.id);
    if (uErr) {
      console.log(`  ✗ ${c.slug}: ${uErr.message}`);
      fail += 1;
    } else {
      ok += 1;
    }
  }
  console.log(`\nDone: ${ok} updated · ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
