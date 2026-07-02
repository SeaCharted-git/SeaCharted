-- Phase 1: extend profiles for diver identity fields.
-- Locked design decisions (see project_seacharted_features memory):
--   - age_range not age (privacy-preserving buckets)
--   - certification_org + certification_level (accommodates PADI/SSI/NAUI/etc.)
--   - dives_prior_to_app + count(dives) = total dives displayed
--   - nationality stored as ISO 3166-1 alpha-2 (US, MX, etc.), private on public
--     profile by default (enforced at app query layer, not RLS)

create type public.profile_age_range as enum (
  'under_18',
  '18_24',
  '25_34',
  '35_44',
  '45_54',
  '55_64',
  '65_plus',
  'prefer_not_to_say'
);

create type public.profile_gender as enum (
  'male',
  'female',
  'non_binary',
  'prefer_not_to_say'
);

create type public.profile_certification_org as enum (
  'padi',
  'ssi',
  'naui',
  'bsac',
  'cmas',
  'raid',
  'sdi_tdi',
  'other'
);

alter table public.profiles
  add column age_range public.profile_age_range,
  add column gender public.profile_gender,
  add column nationality text check (nationality is null or length(nationality) = 2),
  add column certification_org public.profile_certification_org,
  add column certification_level text,
  add column dives_prior_to_app integer not null default 0 check (dives_prior_to_app >= 0),
  add column interests text[] not null default '{}'::text[];

comment on column public.profiles.nationality is 'ISO 3166-1 alpha-2 country code. Private by default; app query layer excludes this column when fetching another user''s profile.';
comment on column public.profiles.dives_prior_to_app is 'Self-reported total dives before joining SeaCharted. Total displayed = this + count(dives table).';
