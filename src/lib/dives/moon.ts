// Reference new moon: 2000-01-06 18:14 UTC.
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH_DAYS = 29.530588853;

// Returns moon phase fraction in [0, 1). 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
export function computeMoonPhase(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  const t = Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  const diffDays = (t - KNOWN_NEW_MOON_MS) / (1000 * 60 * 60 * 24);
  const raw = (diffDays / SYNODIC_MONTH_DAYS) % 1;
  return raw < 0 ? raw + 1 : raw;
}

export function moonPhaseLabel(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return 'New moon';
  if (p < 0.22) return 'Waxing crescent';
  if (p < 0.28) return 'First quarter';
  if (p < 0.47) return 'Waxing gibbous';
  if (p < 0.53) return 'Full moon';
  if (p < 0.72) return 'Waning gibbous';
  if (p < 0.78) return 'Last quarter';
  return 'Waning crescent';
}
