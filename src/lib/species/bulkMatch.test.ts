/**
 * Bulk-upload filename → species-slug matcher for the admin Photo Library.
 * Filenames need to survive spaces, underscores, capitalization, and common
 * extension mismatches without landing on the wrong species.
 */
import { fileNameToSlug, matchFilesToSpecies } from './bulkMatch';

describe('fileNameToSlug', () => {
  test.each([
    ['elkhorn-coral.jpg', 'elkhorn-coral'],
    ['Elkhorn-Coral.JPG', 'elkhorn-coral'],
    ['elkhorn_coral.png', 'elkhorn-coral'],
    ['Elkhorn Coral.webp', 'elkhorn-coral'],
    ['elkhorn  coral.jpg', 'elkhorn-coral'],
    ['french-angelfish.jpeg', 'french-angelfish'],
    ['french angelfish (2).jpg', 'french-angelfish-2'],
    ['no-extension', 'no-extension'],
    ['---weird---name---.jpg', 'weird-name'],
    ['a.jpg', 'a'],
  ])('%s → %s', (input, expected) => {
    expect(fileNameToSlug(input)).toBe(expected);
  });
});

describe('matchFilesToSpecies', () => {
  const catalog = [
    { id: 's1', slug: 'elkhorn-coral', common_name: 'Elkhorn Coral', scientific_name: 'Acropora palmata' },
    { id: 's2', slug: 'french-angelfish', common_name: 'French Angelfish', scientific_name: 'Pomacanthus paru' },
    { id: 's3', slug: 'nurse-shark', common_name: 'Nurse Shark', scientific_name: 'Ginglymostoma cirratum' },
  ];

  test('matches exact slug filenames', () => {
    const res = matchFilesToSpecies(['elkhorn-coral.jpg', 'nurse-shark.png'], catalog);
    expect(res[0].species?.id).toBe('s1');
    expect(res[1].species?.id).toBe('s3');
  });

  test('matches after normalization (spaces, case, underscores)', () => {
    const res = matchFilesToSpecies(
      ['French_Angelfish.jpg', 'ELKHORN CORAL.JPG', 'nurse shark.webp'],
      catalog,
    );
    expect(res[0].species?.id).toBe('s2');
    expect(res[1].species?.id).toBe('s1');
    expect(res[2].species?.id).toBe('s3');
  });

  test('reports unmatched files with species: null', () => {
    const res = matchFilesToSpecies(['not-a-species.jpg', 'random-fish.png'], catalog);
    expect(res[0].species).toBeNull();
    expect(res[1].species).toBeNull();
    expect(res[0].slug).toBe('not-a-species');
  });

  test('preserves original filename alongside derived slug', () => {
    const res = matchFilesToSpecies(['Elkhorn Coral.JPG'], catalog);
    expect(res[0].fileName).toBe('Elkhorn Coral.JPG');
    expect(res[0].slug).toBe('elkhorn-coral');
  });

  test('mix of matched and unmatched in one call', () => {
    const res = matchFilesToSpecies(
      ['elkhorn-coral.jpg', 'unknown-fish.jpg', 'nurse-shark.jpg'],
      catalog,
    );
    expect(res.filter((r) => r.species !== null)).toHaveLength(2);
    expect(res.filter((r) => r.species === null)).toHaveLength(1);
  });
});
