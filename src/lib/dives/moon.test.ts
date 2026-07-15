/**
 * §4 spec: "What was the phase of the moon at the time of the dive?
 * (which can be obtained using the lunar calendar and the date given in point 2)"
 *
 * These tests verify the pure moon-phase computation against known astronomical dates.
 */
import { computeMoonPhase, moonPhaseLabel } from './moon';

describe('computeMoonPhase — §4 lunar phase from date', () => {
  test('returns a fraction in [0, 1) for any date', () => {
    for (const iso of ['2020-01-01', '2023-06-15', '2026-07-14', '2030-12-31']) {
      const p = computeMoonPhase(iso);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  test('is near 0 at a known new moon (2026-06-15)', () => {
    // Reference: NASA lists 2026-06-15 21:54 UTC as new moon.
    const p = computeMoonPhase('2026-06-15');
    expect(Math.min(p, 1 - p)).toBeLessThan(0.08);
  });

  test('is near 0.5 at a known full moon (2026-06-30)', () => {
    // Reference: NASA lists 2026-06-30 04:56 UTC as full moon.
    const p = computeMoonPhase('2026-06-30');
    expect(Math.abs(p - 0.5)).toBeLessThan(0.08);
  });

  test('is monotonically advancing across consecutive dates within a cycle', () => {
    // Between new and full, phase should increase day by day.
    const a = computeMoonPhase('2026-06-16');
    const b = computeMoonPhase('2026-06-20');
    const c = computeMoonPhase('2026-06-25');
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  test('handles malformed date gracefully (year only)', () => {
    // The function falls back to month=1, day=1 for missing parts.
    const p = computeMoonPhase('2026');
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(1);
  });
});

describe('moonPhaseLabel — human-readable phase labels', () => {
  test('labels new moon at fraction 0', () => {
    expect(moonPhaseLabel(0)).toBe('New moon');
  });

  test('labels new moon just below 0.03', () => {
    expect(moonPhaseLabel(0.02)).toBe('New moon');
  });

  test('labels new moon just above 0.97 (wrap-around)', () => {
    expect(moonPhaseLabel(0.98)).toBe('New moon');
  });

  test('labels first quarter around 0.25', () => {
    expect(moonPhaseLabel(0.25)).toBe('First quarter');
  });

  test('labels full moon around 0.5', () => {
    expect(moonPhaseLabel(0.5)).toBe('Full moon');
  });

  test('labels last quarter around 0.75', () => {
    expect(moonPhaseLabel(0.75)).toBe('Last quarter');
  });

  test('labels waxing crescent between new and first quarter', () => {
    expect(moonPhaseLabel(0.1)).toBe('Waxing crescent');
  });

  test('labels waxing gibbous between first quarter and full', () => {
    expect(moonPhaseLabel(0.35)).toBe('Waxing gibbous');
  });

  test('labels waning gibbous between full and last quarter', () => {
    expect(moonPhaseLabel(0.6)).toBe('Waning gibbous');
  });

  test('labels waning crescent between last quarter and new', () => {
    expect(moonPhaseLabel(0.85)).toBe('Waning crescent');
  });

  test('handles phase > 1 via modulo wrap', () => {
    expect(moonPhaseLabel(1.25)).toBe('First quarter');
  });

  test('handles negative phase via modulo wrap', () => {
    expect(moonPhaseLabel(-0.25)).toBe('Last quarter');
  });
});
