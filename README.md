# SeaCharted

Cozumel dive-log and citizen-science app. Divers record their dives — site,
depth, weather, sightings, hashtag-indexed observations — and the aggregate
becomes a public research portal at `/research`.

Live at https://sea-charted.vercel.app.

## Stack

Expo 57 (React Native 0.86, React 19, expo-router file routing) · Supabase
(auth, Postgres w/ RLS, storage) · Mapbox GL (web map) · react-native-maps
(iOS/Android map) · TypeScript everywhere.

## Get started

```bash
npm install
cp .env.example .env    # fill in Supabase + Mapbox tokens
npm run web             # http://localhost:8081 in a browser
npm run ios             # iOS Simulator (Xcode required)
```

Migrations live in `supabase/migrations/`; apply with
`supabase db push --linked`.

## Spec coverage

Requirements sourced from the Cozumel dive-log requirements doc (5 blocks):

| # | Requirement | Status |
| - | - | - |
| 1 | Diver profile (name, age, dives, cert, nationality, gender, interests, media gallery) | ✅ done. **Age is stored as a bucket** (18–24, 25–34, …) not an exact number — intentional privacy design; hinted in the Age range field. |
| 2 | Date, max depth, dive site (name + GPS + island map) | ✅ done. 30 curated Cozumel sites seeded; users can submit off-list sites. |
| 3 | Sightings by category (7 buckets) sourced from *Caribbean Reef Life* | ✅ done. 354 species seeded, every row cites Charteris 3rd ed. |
| 4 | Weather (sky, wind, moon phase auto-computed) + underwater (current, visibility, water temp) | ✅ done. |
| 5 | Specific observations (disease / anomaly / unlisted species / mating-spawning) with `#hashtag` database | ✅ done. Hashtags parsed into `hashtag_mentions` and surfaced on `/research`; observations without a `#tag` save with a soft-warn banner. Optional photo attachment for "photographic evidence." |

Additional platform features not in the original spec:

- Media gallery aggregating every user photo/video at `/profile/gallery`.
- Video capture, upload (≤50 MB, no server transcode), and playback via
  `expo-video`. Poster frames generated client-side at t=1s.
- Native map on iOS (Apple Maps) via react-native-maps; web keeps its
  Mapbox satellite basemap.

## Deploy

- Web: pushed to `main` on GitHub `SuitYourPartner-git/SeaCharted` →
  Vercel auto-deploys (config in `vercel.json`).
- Native: `expo run:ios` for local Simulator builds. TestFlight upload is
  deferred until an Apple Developer Program account is enrolled.

## Docs

- `docs/caribbean_reef_life.pdf` — the species catalog source of truth.
- Migrations, RLS policies, and seed data in `supabase/migrations/`.
