export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type SiteType =
  | 'reef'
  | 'wall'
  | 'drift'
  | 'wreck'
  | 'shore'
  | 'cavern'
  | 'other';

export interface DiveSite {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  difficulty: Difficulty | null;
  max_depth_m: number | null;
  site_type: SiteType | null;
  created_at: string;
}

export type AgeRange =
  | 'under_18'
  | '18_24'
  | '25_34'
  | '35_44'
  | '45_54'
  | '55_64'
  | '65_plus'
  | 'prefer_not_to_say';

export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export type CertificationOrg =
  | 'padi'
  | 'ssi'
  | 'naui'
  | 'bsac'
  | 'cmas'
  | 'raid'
  | 'sdi_tdi'
  | 'other';

export interface Profile {
  id: string;
  display_name: string | null;
  home_location: string | null;
  avatar_url: string | null;
  is_public: boolean;
  age_range: AgeRange | null;
  gender: Gender | null;
  nationality: string | null;
  certification_org: CertificationOrg | null;
  certification_level: string | null;
  dives_prior_to_app: number;
  interests: string[];
  is_admin: boolean;
}

export type Sky = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
export type WindCardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type CurrentStrength = 'light' | 'moderate' | 'strong';
export type CurrentDirection = 'normal_s_to_n' | 'reversed_n_to_s' | 'changing';

export interface Dive {
  id: string;
  user_id: string;
  site_id: string;
  dive_date: string;
  max_depth_m: number | null;
  duration_min: number | null;
  buddy_name: string | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
  sky: Sky | null;
  wind_kts: number | null;
  wind_dir: WindCardinal | null;
  moon_phase: number | null;
  current_strength: CurrentStrength | null;
  current_direction: CurrentDirection | null;
  visibility_m: number | null;
  water_temp_c_observed: number | null;
  cover_photo_id: string | null;
}

export type SpeciesCategory =
  | 'marine_plant'
  | 'sponge'
  | 'coral'
  | 'invertebrate'
  | 'fish'
  | 'sea_turtle'
  | 'marine_mammal';

export interface Species {
  id: string;
  slug: string;
  common_name: string;
  scientific_name: string;
  category: SpeciesCategory;
  description: string | null;
  source_reference: string | null;
  is_verified: boolean;
  submitted_by: string | null;
  created_at: string;
}

export interface SpeciesPhoto {
  id: string;
  species_id: string;
  storage_path: string;
  is_primary: boolean;
  credit: string | null;
  source_url: string | null;
  license: string | null;
  uploaded_by: string;
  created_at: string;
}

export type SightingCount = 'count_1' | 'count_2_5' | 'count_5_20' | 'count_20_plus' | 'count_school';

export interface Sighting {
  id: string;
  dive_id: string;
  species_id: string;
  count_bucket: SightingCount;
  note: string | null;
  created_at: string;
}

export type ObservationBucket = 'disease' | 'anomaly' | 'unlisted_species' | 'mating_spawning';

export interface Observation {
  id: string;
  dive_id: string;
  bucket: ObservationBucket;
  description: string;
  photo_id: string | null;
  created_at: string;
}

export interface HashtagMention {
  id: string;
  observation_id: string;
  tag: string;
  species_id: string | null;
  created_at: string;
}

export type MediaType = 'photo' | 'video';

export interface DivePhoto {
  id: string;
  dive_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  media_type: MediaType;
  duration_ms: number | null;
  poster_path: string | null;
}

export type TideState = 'low' | 'rising' | 'high' | 'falling';

export interface Conditions {
  site_id: string;
  fetched_at: string;
  wind_kts: number | null;
  wind_dir_deg: number | null;
  air_temp_c: number | null;
  water_temp_c: number | null;
  swell_m: number | null;
  swell_period_s: number | null;
  tide_state: TideState | null;
}
