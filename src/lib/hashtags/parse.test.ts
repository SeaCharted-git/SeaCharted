/**
 * §5 universal rule: "the diver must add the # symbol before the name of the animal
 * or plant, in order to generate a specific database that we can access."
 *
 * These tests cover the parser that extracts those tags from free-text observations.
 */
import { parseHashtags } from './parse';

describe('parseHashtags — universal #hashtag rule (§5)', () => {
  test('extracts a single lowercase tag', () => {
    expect(parseHashtags('Saw a #grouper today')).toEqual(['grouper']);
  });

  test('extracts multiple distinct tags in order of first appearance', () => {
    expect(parseHashtags('#eagleray glided past a #greenmoray and a #grouper'))
      .toEqual(['eagleray', 'greenmoray', 'grouper']);
  });

  test('dedupes repeated tags', () => {
    expect(parseHashtags('#grouper again #grouper')).toEqual(['grouper']);
  });

  test('is case-insensitive and normalizes to lowercase', () => {
    expect(parseHashtags('#EagleRay and #EAGLERAY and #eagleray'))
      .toEqual(['eagleray']);
  });

  test('accepts snake_case tags', () => {
    expect(parseHashtags('#green_moray_eel')).toEqual(['green_moray_eel']);
  });

  test('accepts hyphenated tags', () => {
    expect(parseHashtags('#green-moray-eel')).toEqual(['green-moray-eel']);
  });

  test('accepts digits after first letter', () => {
    expect(parseHashtags('#grouper2')).toEqual(['grouper2']);
  });

  test('rejects tags that start with a digit (must start with a letter)', () => {
    expect(parseHashtags('#2grouper')).toEqual([]);
  });

  test('rejects a bare # with no letter', () => {
    expect(parseHashtags('just # symbol')).toEqual([]);
  });

  test('rejects single-character tags (regex requires 2+ chars)', () => {
    expect(parseHashtags('#a')).toEqual([]);
  });

  test('returns empty array for text with no hashtags', () => {
    expect(parseHashtags('A tailless eagle ray glided past.')).toEqual([]);
  });

  test('returns empty array for empty text', () => {
    expect(parseHashtags('')).toEqual([]);
  });

  test('handles punctuation boundaries correctly', () => {
    expect(parseHashtags('Wow, #grouper! And #eagleray, and #turtle.'))
      .toEqual(['grouper', 'eagleray', 'turtle']);
  });

  test('does not break on hash inside a URL fragment', () => {
    // URL fragments like #Section still yield a valid-looking tag —
    // this is a documented parser tradeoff, not a bug.
    expect(parseHashtags('https://example.com/page#section')).toEqual(['section']);
  });

  test('extracts many tags in a long observation', () => {
    const text = 'Cozumel drift: #grouper #eagleray #turtle #sponge #coral #nudibranch #wrasse';
    expect(parseHashtags(text)).toEqual([
      'grouper', 'eagleray', 'turtle', 'sponge', 'coral', 'nudibranch', 'wrasse',
    ]);
  });

  test('handles adjacent tags separated by punctuation', () => {
    expect(parseHashtags('#grouper,#eagleray,#turtle'))
      .toEqual(['grouper', 'eagleray', 'turtle']);
  });

  test('caps tag length at ~65 chars (regex allows first letter + 64)', () => {
    const long = 'a' + 'b'.repeat(64);
    expect(parseHashtags(`#${long}`)).toEqual([long]);
    const tooLong = 'a' + 'b'.repeat(200);
    // Parser matches only the first 65 chars — verifies the max-length guard
    // fires (would otherwise be a DB bloat vector for long text observations).
    const [tag] = parseHashtags(`#${tooLong}`);
    expect(tag?.length).toBeLessThanOrEqual(65);
  });
});
