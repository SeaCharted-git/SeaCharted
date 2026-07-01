import { z } from 'zod';

const MarineCurrent = z
  .object({
    time: z.string().optional(),
    sea_surface_temperature: z.number().nullable().optional(),
    swell_wave_height: z.number().nullable().optional(),
    swell_wave_period: z.number().nullable().optional(),
    wave_height: z.number().nullable().optional(),
    wave_period: z.number().nullable().optional(),
  })
  .optional();

const MarineResponse = z.object({ current: MarineCurrent });

const WeatherCurrent = z
  .object({
    time: z.string().optional(),
    temperature_2m: z.number().nullable().optional(),
    wind_speed_10m: z.number().nullable().optional(),
    wind_direction_10m: z.number().nullable().optional(),
  })
  .optional();

const WeatherResponse = z.object({ current: WeatherCurrent });

export interface WeatherSample {
  fetched_at: string;
  wind_kts: number | null;
  wind_dir_deg: number | null;
  air_temp_c: number | null;
  water_temp_c: number | null;
  swell_m: number | null;
  swell_period_s: number | null;
}

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

export async function fetchWeatherSample(lat: number, lng: number): Promise<WeatherSample> {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=sea_surface_temperature,swell_wave_height,swell_wave_period,wave_height,wave_period`;

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,wind_direction_10m` +
    `&wind_speed_unit=kn`;

  const [marine, weather] = await Promise.all([
    fetchJson(marineUrl, MarineResponse),
    fetchJson(weatherUrl, WeatherResponse),
  ]);

  return {
    fetched_at: new Date().toISOString(),
    wind_kts: weather.current?.wind_speed_10m ?? null,
    wind_dir_deg: weather.current?.wind_direction_10m ?? null,
    air_temp_c: weather.current?.temperature_2m ?? null,
    water_temp_c: marine.current?.sea_surface_temperature ?? null,
    swell_m: marine.current?.swell_wave_height ?? null,
    swell_period_s: marine.current?.swell_wave_period ?? null,
  };
}
