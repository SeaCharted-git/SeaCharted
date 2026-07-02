import type {
  AgeRange,
  CertificationOrg,
  CurrentDirection,
  CurrentStrength,
  Gender,
  ObservationBucket,
  SightingCount,
  Sky,
  SpeciesCategory,
  WindCardinal,
} from '@/lib/types';

export const AGE_RANGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18-24' },
  { value: '25_34', label: '25-34' },
  { value: '35_44', label: '35-44' },
  { value: '45_54', label: '45-54' },
  { value: '55_64', label: '55-64' },
  { value: '65_plus', label: '65+' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const CERT_ORG_OPTIONS: { value: CertificationOrg; label: string }[] = [
  { value: 'padi', label: 'PADI' },
  { value: 'ssi', label: 'SSI' },
  { value: 'naui', label: 'NAUI' },
  { value: 'bsac', label: 'BSAC' },
  { value: 'cmas', label: 'CMAS' },
  { value: 'raid', label: 'RAID' },
  { value: 'sdi_tdi', label: 'SDI/TDI' },
  { value: 'other', label: 'Other' },
];

export const SKY_OPTIONS: { value: Sky; label: string }[] = [
  { value: 'sunny', label: 'Sunny' },
  { value: 'partly_cloudy', label: 'Partly cloudy' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'rainy', label: 'Rainy' },
];

export const WIND_DIR_OPTIONS: { value: WindCardinal; label: string }[] = [
  { value: 'N', label: 'N' },
  { value: 'NE', label: 'NE' },
  { value: 'E', label: 'E' },
  { value: 'SE', label: 'SE' },
  { value: 'S', label: 'S' },
  { value: 'SW', label: 'SW' },
  { value: 'W', label: 'W' },
  { value: 'NW', label: 'NW' },
];

export const CURRENT_STRENGTH_OPTIONS: { value: CurrentStrength; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
];

export const CURRENT_DIR_OPTIONS: { value: CurrentDirection; label: string }[] = [
  { value: 'normal_s_to_n', label: 'Normal (S → N)' },
  { value: 'reversed_n_to_s', label: 'Reversed (N → S)' },
  { value: 'changing', label: 'Changing' },
];

export const SPECIES_CATEGORY_OPTIONS: { value: SpeciesCategory; label: string }[] = [
  { value: 'marine_plant', label: 'Marine plants' },
  { value: 'sponge', label: 'Sponges' },
  { value: 'coral', label: 'Corals' },
  { value: 'invertebrate', label: 'Invertebrates' },
  { value: 'fish', label: 'Fish' },
  { value: 'sea_turtle', label: 'Sea turtles' },
  { value: 'marine_mammal', label: 'Marine mammals' },
];

export const SIGHTING_COUNT_OPTIONS: { value: SightingCount; label: string }[] = [
  { value: 'count_1', label: '1' },
  { value: 'count_2_5', label: '2-5' },
  { value: 'count_5_20', label: '5-20' },
  { value: 'count_20_plus', label: '20+' },
  { value: 'count_school', label: 'Many' },
];

export const OBSERVATION_BUCKET_OPTIONS: { value: ObservationBucket; label: string }[] = [
  { value: 'disease', label: 'Disease' },
  { value: 'anomaly', label: 'Anomaly' },
  { value: 'unlisted_species', label: 'Unlisted species' },
  { value: 'mating_spawning', label: 'Mating / spawning' },
];
