#!/usr/bin/env node
/**
 * Backfill species photos from Wikipedia / Wikimedia Commons / iNaturalist.
 *
 * For each verified species without a primary photo, this script tries three
 * sources in order and stops at the first hit:
 *   1. Wikipedia lead image by scientific_name (pageimages API)
 *   2. Wikimedia Commons image search by scientific_name
 *   3. iNaturalist taxa API — better coverage for marine invertebrates,
 *      sponges, algae, and other WM-thin categories
 *
 * Downloads a pre-scaled image (WM: width=2048, iNat: large_url ~1024px),
 * uploads it to Supabase Storage, and inserts a species_photos row with
 * is_primary=true and attribution/license from the source.
 *
 * Idempotent: species that already have a primary photo are skipped.
 *
 * Requires:
 *   - EXPO_PUBLIC_SUPABASE_URL       (public)
 *   - SUPABASE_SERVICE_ROLE_KEY      (secret, bypasses RLS)
 *
 * Usage:
 *   node scripts/backfill-species-photos.mjs               # full run
 *   node scripts/backfill-species-photos.mjs --dry-run     # no writes
 *   node scripts/backfill-species-photos.mjs --limit 20    # first 20 only (alpha)
 *   node scripts/backfill-species-photos.mjs --dry-run --limit 20
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// --- Env loading ------------------------------------------------------------

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
  } catch {
    // .env is optional — env may be provided by the shell instead.
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotEnv(resolve(__dirname, '..', '.env'));

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing required env: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

// --- Args -------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

// --- Supabase client (service role) ----------------------------------------

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Wikimedia -------------------------------------------------------------

const UA = 'SeaCharted-Backfill/1.0 (https://sea-charted.vercel.app)';
const RATE_LIMIT_MS = 100;
const IMAGE_WIDTH = 2048;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wpLeadImage(scientificName) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'pageimages',
    titles: scientificName,
    pithumbsize: String(IMAGE_WIDTH),
    redirects: '1',
  }).toString();

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const thumb = page.thumbnail?.source;
  const file = page.pageimage;
  if (!thumb || !file) return null;
  return { thumbUrl: thumb, fileName: `File:${file}` };
}

async function commonsSearchImage(scientificName) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${scientificName} filemime:image/jpeg`,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: String(IMAGE_WIDTH),
  }).toString();

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) return null;
  return { thumbUrl: info.thumburl, fileName: page.title, extmetadata: info.extmetadata };
}

async function commonsFileMetadata(fileName) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: fileName,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(IMAGE_WIDTH),
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page?.imageinfo?.[0] ?? null;
}

/** Strips HTML from an extmetadata field value. */
function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCredit(extmetadata, fileName) {
  const artist = stripHtml(extmetadata?.Artist?.value) || 'Unknown';
  const license = stripHtml(extmetadata?.LicenseShortName?.value) || 'see Commons';
  return `${artist} · ${license} · Wikimedia Commons`;
}

function commonsSourceUrl(fileName) {
  // fileName is like "File:Some Species.jpg"; strip the "File:" prefix in the URL segment.
  const bare = fileName.replace(/^File:/, '');
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(bare)}`;
}

async function fetchImageBytes(thumbUrl) {
  const res = await fetch(thumbUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`image fetch ${res.status}: ${thumbUrl}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// --- Backfill --------------------------------------------------------------

function randomId() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function detectAdminUserId() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .order('id')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`admin lookup: ${error.message}`);
  if (!data) throw new Error('No admin profile found; set profiles.is_admin=true on your user first');
  return data.id;
}

async function listSpeciesNeedingPhotos() {
  // species with no primary photo yet
  const { data: allSp, error: spErr } = await supabase
    .from('species')
    .select('id, slug, common_name, scientific_name')
    .eq('is_verified', true)
    .order('common_name');
  if (spErr) throw new Error(`species list: ${spErr.message}`);

  const { data: primaries, error: pErr } = await supabase
    .from('species_photos')
    .select('species_id')
    .eq('is_primary', true);
  if (pErr) throw new Error(`primary list: ${pErr.message}`);
  const withPrimary = new Set((primaries ?? []).map((p) => p.species_id));

  return (allSp ?? []).filter((s) => !withPrimary.has(s.id));
}

async function inaturalistImage(scientificName) {
  const url = new URL('https://api.inaturalist.org/v1/taxa');
  url.searchParams.set('q', scientificName);
  url.searchParams.set('rank', 'species');
  url.searchParams.set('per_page', '5');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  // Only accept results whose taxon.name exactly matches the queried scientific
  // name — iNat's search is fuzzy and can return unrelated taxa first.
  const match = (json.results ?? []).find(
    (t) => (t.name ?? '').toLowerCase() === scientificName.toLowerCase(),
  );
  if (!match?.default_photo) return null;
  const photo = match.default_photo;
  const thumbUrl = photo.large_url ?? photo.medium_url ?? photo.original_url;
  if (!thumbUrl) return null;
  const license = photo.license_code ? photo.license_code.toUpperCase() : null;
  const credit = photo.attribution
    ? `${photo.attribution} · via iNaturalist`
    : `iNaturalist taxon ${match.id}`;
  return {
    thumbUrl,
    fileName: `iNaturalist:${match.id}`,
    credit,
    sourceUrl: `https://www.inaturalist.org/taxa/${match.id}`,
    license,
  };
}

async function resolveWmImage(scientificName) {
  // Try Wikipedia lead image first.
  const wp = await wpLeadImage(scientificName);
  if (wp) {
    // Enrich with Commons metadata for the license/attribution.
    const meta = await commonsFileMetadata(wp.fileName);
    return {
      thumbUrl: wp.thumbUrl,
      fileName: wp.fileName,
      credit: formatCredit(meta?.extmetadata, wp.fileName),
      sourceUrl: commonsSourceUrl(wp.fileName),
      license: stripHtml(meta?.extmetadata?.LicenseShortName?.value) || null,
    };
  }
  // Second: search Commons directly.
  await sleep(RATE_LIMIT_MS);
  const cs = await commonsSearchImage(scientificName);
  if (cs) {
    return {
      thumbUrl: cs.thumbUrl,
      fileName: cs.fileName,
      credit: formatCredit(cs.extmetadata, cs.fileName),
      sourceUrl: commonsSourceUrl(cs.fileName),
      license: stripHtml(cs.extmetadata?.LicenseShortName?.value) || null,
    };
  }
  // Third: iNaturalist. Better coverage for marine invertebrates + algae.
  await sleep(RATE_LIMIT_MS);
  const inat = await inaturalistImage(scientificName);
  if (inat) return inat;
  return null;
}

async function uploadOne(species, adminId) {
  const found = await resolveWmImage(species.scientific_name);
  if (!found) return { status: 'no_match' };

  if (DRY_RUN) {
    return {
      status: 'would_upload',
      credit: found.credit,
      sourceUrl: found.sourceUrl,
      license: found.license,
    };
  }

  const bytes = await fetchImageBytes(found.thumbUrl);
  if (bytes.byteLength > 5 * 1024 * 1024) {
    return { status: 'too_large', bytes: bytes.byteLength };
  }

  const path = `${species.id}/${randomId()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from('species-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (upErr) return { status: 'error', error: `storage: ${upErr.message}` };

  const { error: insErr } = await supabase.from('species_photos').insert({
    species_id: species.id,
    storage_path: path,
    is_primary: true,
    credit: found.credit,
    source_url: found.sourceUrl,
    license: found.license,
    uploaded_by: adminId,
  });
  if (insErr) {
    await supabase.storage.from('species-photos').remove([path]);
    return { status: 'error', error: `db: ${insErr.message}` };
  }
  return {
    status: 'uploaded',
    credit: found.credit,
    sourceUrl: found.sourceUrl,
    license: found.license,
  };
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log(`\n== Species photo backfill ${DRY_RUN ? '(DRY RUN)' : ''} ==`);
  console.log(`Supabase: ${SUPABASE_URL}`);

  const adminId = DRY_RUN ? '(dry-run)' : await detectAdminUserId();
  if (!DRY_RUN) console.log(`Attributing uploads to admin user: ${adminId}`);

  let species = await listSpeciesNeedingPhotos();
  console.log(`Species needing a primary photo: ${species.length}`);
  if (LIMIT !== null) {
    species = species.slice(0, LIMIT);
    console.log(`--limit ${LIMIT} → processing ${species.length}`);
  }

  const counts = { uploaded: 0, would_upload: 0, no_match: 0, too_large: 0, error: 0 };
  const noMatch = [];
  const errors = [];

  const width = String(species.length).length;
  for (let i = 0; i < species.length; i++) {
    const sp = species[i];
    const n = String(i + 1).padStart(width, ' ');
    try {
      const r = await uploadOne(sp, adminId);
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === 'uploaded' || r.status === 'would_upload') {
        console.log(`[${n}/${species.length}] ✓ ${sp.slug} — ${r.credit}`);
      } else if (r.status === 'no_match') {
        console.log(`[${n}/${species.length}] ✗ ${sp.slug} — no WM match`);
        noMatch.push(sp.slug);
      } else if (r.status === 'too_large') {
        console.log(`[${n}/${species.length}] ⚠ ${sp.slug} — image too large (${(r.bytes / 1e6).toFixed(1)} MB)`);
      } else if (r.status === 'error') {
        console.log(`[${n}/${species.length}] ✗ ${sp.slug} — ${r.error}`);
        errors.push({ slug: sp.slug, error: r.error });
      }
    } catch (e) {
      counts.error += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[${n}/${species.length}] ✗ ${sp.slug} — ${msg}`);
      errors.push({ slug: sp.slug, error: msg });
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log('\n== Summary ==');
  console.log(`Processed:      ${species.length}`);
  if (!DRY_RUN) console.log(`Uploaded:       ${counts.uploaded}`);
  if (DRY_RUN) console.log(`Would upload:   ${counts.would_upload}`);
  console.log(`No WM match:    ${counts.no_match}`);
  console.log(`Too large:      ${counts.too_large}`);
  console.log(`Errors:         ${counts.error}`);
  if (noMatch.length > 0 && noMatch.length <= 40) {
    console.log(`\nSpecies with no WM match (manual upload needed via /admin/species):`);
    for (const s of noMatch) console.log(`  - ${s}`);
  } else if (noMatch.length > 40) {
    console.log(`\n${noMatch.length} species with no WM match (first 40):`);
    for (const s of noMatch.slice(0, 40)) console.log(`  - ${s}`);
  }
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) console.log(`  - ${e.slug}: ${e.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
