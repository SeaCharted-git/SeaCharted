/**
 * §2 spec: "users should be able to access a list of dive site names on Cozumel Island,
 * their GPS coordinates, and a map of the island for visual and geographical identification."
 *
 * These tests verify the seeded Cozumel dive-site catalog is well-formed and
 * geographically coherent (all coords sit in the Cozumel bounding box).
 */
import { cozumelSeed } from './seed-cozumel';

// Cozumel island roughly spans 20.35°N–20.60°N, -87.05°W to -86.70°W.
// Give a small buffer to cover offshore dive-site waypoints.
const COZUMEL_LAT_MIN = 20.25;
const COZUMEL_LAT_MAX = 20.65;
const COZUMEL_LNG_MIN = -87.10;
const COZUMEL_LNG_MAX = -86.60;

const VALID_DIFFICULTY = ['beginner', 'intermediate', 'advanced'] as const;
const VALID_SITE_TYPES = ['reef', 'wall', 'drift', 'wreck', 'shore', 'cavern', 'other'] as const;

describe('cozumelSeed — dive site catalog (§2)', () => {
  test('has at least 20 sites (spec says "a list", we seeded ~30)', () => {
    expect(cozumelSeed.length).toBeGreaterThanOrEqual(20);
  });

  test('every site has an id and a non-empty slug and name', () => {
    for (const s of cozumelSeed) {
      expect(s.id).toBeTruthy();
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
      expect(s.name.trim().length).toBeGreaterThan(0);
    }
  });

  test('every site has a finite lat/lng (§2 GPS coordinates)', () => {
    for (const s of cozumelSeed) {
      expect(Number.isFinite(s.lat)).toBe(true);
      expect(Number.isFinite(s.lng)).toBe(true);
    }
  });

  test('every lat sits within Cozumel bounding box', () => {
    for (const s of cozumelSeed) {
      expect(s.lat).toBeGreaterThanOrEqual(COZUMEL_LAT_MIN);
      expect(s.lat).toBeLessThanOrEqual(COZUMEL_LAT_MAX);
    }
  });

  test('every lng sits within Cozumel bounding box', () => {
    for (const s of cozumelSeed) {
      expect(s.lng).toBeGreaterThanOrEqual(COZUMEL_LNG_MIN);
      expect(s.lng).toBeLessThanOrEqual(COZUMEL_LNG_MAX);
    }
  });

  test('slugs are unique across the seed', () => {
    const slugs = cozumelSeed.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('ids are unique across the seed', () => {
    const ids = cozumelSeed.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every difficulty (when set) is a valid enum value', () => {
    for (const s of cozumelSeed) {
      if (s.difficulty !== null) {
        expect(VALID_DIFFICULTY).toContain(s.difficulty);
      }
    }
  });

  test('every site_type (when set) is a valid enum value', () => {
    for (const s of cozumelSeed) {
      if (s.site_type !== null) {
        expect(VALID_SITE_TYPES).toContain(s.site_type);
      }
    }
  });

  test('every max_depth_m (when set) is positive and sane (< 100 m)', () => {
    for (const s of cozumelSeed) {
      if (s.max_depth_m !== null) {
        expect(s.max_depth_m).toBeGreaterThan(0);
        expect(s.max_depth_m).toBeLessThan(100);
      }
    }
  });

  test('includes iconic Cozumel sites (spot-check)', () => {
    const slugs = new Set(cozumelSeed.map((s) => s.slug));
    // Barracuda Reef is one of the most famous drift sites on the north end.
    expect(slugs.has('barracuda-reef')).toBe(true);
  });
});
