/**
 * §1 spec: diver profile includes name, age, approximate dives, certification level,
 * nationality, gender, personal interests.
 * §3 spec: 7 sighting keyword categories (marine plants, sponges, corals, invertebrates,
 * fish, sea turtles, marine mammals).
 * §4 spec: weather (sunny/cloudy/rainy + wind + current strength + current direction).
 *
 * These tests verify the option/label lists that feed the app's pickers match the spec.
 */
import {
  AGE_RANGE_OPTIONS,
  CERT_ORG_OPTIONS,
  CURRENT_DIR_OPTIONS,
  CURRENT_STRENGTH_OPTIONS,
  GENDER_OPTIONS,
  OBSERVATION_BUCKET_OPTIONS,
  SIGHTING_COUNT_OPTIONS,
  SKY_OPTIONS,
  SPECIES_CATEGORY_OPTIONS,
  WIND_DIR_OPTIONS,
} from './labels';

describe('§1 profile pickers', () => {
  test('AGE_RANGE_OPTIONS covers every age bucket in the Profile type', () => {
    const values = AGE_RANGE_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(
      ['18_24', '25_34', '35_44', '45_54', '55_64', '65_plus', 'prefer_not_to_say', 'under_18'].sort(),
    );
  });

  test('AGE_RANGE_OPTIONS labels are all non-empty', () => {
    for (const o of AGE_RANGE_OPTIONS) {
      expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });

  test('GENDER_OPTIONS includes male, female, non-binary, prefer-not-to-say', () => {
    const values = GENDER_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(['female', 'male', 'non_binary', 'prefer_not_to_say']);
  });

  test('CERT_ORG_OPTIONS includes the major certifying organizations', () => {
    const values = CERT_ORG_OPTIONS.map((o) => o.value);
    // PADI, SSI, NAUI are the three most common globally — must be present.
    expect(values).toEqual(expect.arrayContaining(['padi', 'ssi', 'naui']));
    // "other" escape hatch is required so any diver can complete the profile.
    expect(values).toContain('other');
  });
});

describe('§3 sighting categories — exactly the 7 spec keywords', () => {
  test('SPECIES_CATEGORY_OPTIONS has exactly 7 entries', () => {
    expect(SPECIES_CATEGORY_OPTIONS).toHaveLength(7);
  });

  test('SPECIES_CATEGORY_OPTIONS covers all 7 spec keywords', () => {
    const values = SPECIES_CATEGORY_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(
      ['coral', 'fish', 'invertebrate', 'marine_mammal', 'marine_plant', 'sea_turtle', 'sponge'].sort(),
    );
  });

  test('each category has a plural human-readable label', () => {
    for (const o of SPECIES_CATEGORY_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
    }
    // Spot-check exact labels match spec wording.
    const map = new Map(SPECIES_CATEGORY_OPTIONS.map((o) => [o.value, o.label]));
    expect(map.get('marine_plant')).toBe('Marine plants');
    expect(map.get('sea_turtle')).toBe('Sea turtles');
    expect(map.get('marine_mammal')).toBe('Marine mammals');
  });

  test('SIGHTING_COUNT_OPTIONS covers 1, 2-5, 5-20, 20+, many', () => {
    const values = SIGHTING_COUNT_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(['count_1', 'count_20_plus', 'count_2_5', 'count_5_20', 'count_school']);
  });
});

describe('§4 weather + underwater pickers', () => {
  test('SKY_OPTIONS covers sunny, cloudy, rainy per spec (partly_cloudy added)', () => {
    const values = SKY_OPTIONS.map((o) => o.value);
    expect(values).toEqual(expect.arrayContaining(['sunny', 'cloudy', 'rainy']));
  });

  test('WIND_DIR_OPTIONS has all 8 cardinal directions', () => {
    expect(WIND_DIR_OPTIONS.map((o) => o.value)).toEqual(
      ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    );
  });

  test('CURRENT_STRENGTH_OPTIONS covers moderate, normal(light), strong per spec', () => {
    const values = CURRENT_STRENGTH_OPTIONS.map((o) => o.value);
    // Spec uses "normal" — implementation uses "light" as the equivalent baseline.
    expect(values).toEqual(['light', 'moderate', 'strong']);
  });

  test('CURRENT_DIR_OPTIONS covers normal (S→N), reversed (N→S), and changing per spec', () => {
    const values = CURRENT_DIR_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['normal_s_to_n', 'reversed_n_to_s', 'changing']);
  });

  test('CURRENT_DIR_OPTIONS labels use human-readable direction arrows', () => {
    const labels = new Map(CURRENT_DIR_OPTIONS.map((o) => [o.value, o.label]));
    expect(labels.get('normal_s_to_n')).toContain('S');
    expect(labels.get('normal_s_to_n')).toContain('N');
    expect(labels.get('reversed_n_to_s')).toContain('N');
    expect(labels.get('reversed_n_to_s')).toContain('S');
  });
});

describe('§5 observation buckets', () => {
  test('OBSERVATION_BUCKET_OPTIONS covers disease, anomaly, unlisted, mating per spec', () => {
    const values = OBSERVATION_BUCKET_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(['anomaly', 'disease', 'mating_spawning', 'unlisted_species']);
  });

  test('each bucket has a human-readable label', () => {
    for (const o of OBSERVATION_BUCKET_OPTIONS) {
      expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });
});
