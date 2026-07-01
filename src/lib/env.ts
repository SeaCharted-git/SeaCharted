import { z } from 'zod';

const schema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(20),
  mapboxToken: z.string().min(10),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Missing or invalid env vars: ${missing}. Copy .env.example → .env at the repo root and fill in Supabase + Mapbox values.`,
    );
  }
  cached = parsed.data;
  return cached;
}
