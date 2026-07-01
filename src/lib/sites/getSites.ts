import type { DiveSite } from '@/lib/types';

import { cozumelSeed } from './seed-cozumel';

export async function getSites(): Promise<DiveSite[]> {
  return cozumelSeed;
}

export async function getSiteBySlug(slug: string): Promise<DiveSite | null> {
  return cozumelSeed.find((s) => s.slug === slug) ?? null;
}
