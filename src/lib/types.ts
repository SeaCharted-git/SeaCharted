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

export interface Profile {
  id: string;
  display_name: string | null;
  home_location: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

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
}

export interface DivePhoto {
  id: string;
  dive_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
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
