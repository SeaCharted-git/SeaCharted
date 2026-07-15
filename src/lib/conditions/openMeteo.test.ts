/**
 * §4 spec (outside): sky conditions, winds and direction, moon phase.
 * §4 spec (underwater): current, direction, visibility, temperature.
 *
 * Open-Meteo fills the OUTSIDE bucket automatically (temperature, wind, sea surface temp).
 * Underwater specifics come from diver-entered fields (covered in labels.test.ts and
 * DiveConditions.test.tsx).
 *
 * These tests mock `fetch` and verify request URLs + response mapping.
 */
import { fetchWeatherSample } from './openMeteo';

describe('fetchWeatherSample — Open-Meteo weather + marine (§4 outside conditions)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('requests marine and weather endpoints with lat/lng', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      calls.push(url);
      if (url.includes('marine-api')) {
        return {
          ok: true,
          json: async () => ({
            current: { sea_surface_temperature: 27.5, swell_wave_height: 0.5, swell_wave_period: 6, wave_height: 0.8, wave_period: 5 },
          }),
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          current: { temperature_2m: 28.1, wind_speed_10m: 12.4, wind_direction_10m: 90 },
        }),
      } as any;
    }) as any;

    await fetchWeatherSample(20.5, -86.9);
    expect(calls).toHaveLength(2);
    expect(calls.some((u) => u.includes('marine-api.open-meteo.com'))).toBe(true);
    expect(calls.some((u) => u.includes('api.open-meteo.com'))).toBe(true);
    for (const c of calls) {
      expect(c).toContain('latitude=20.5');
      expect(c).toContain('longitude=-86.9');
    }
  });

  test('requests wind in knots (matches DB unit)', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ current: {} }),
      } as any;
    }) as any;

    await fetchWeatherSample(20.5, -86.9);
    const weatherCall = calls.find((u) => u.includes('api.open-meteo.com/v1/forecast'));
    expect(weatherCall).toContain('wind_speed_unit=kn');
  });

  test('maps response into WeatherSample shape', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes('marine-api')) {
        return {
          ok: true,
          json: async () => ({
            current: { sea_surface_temperature: 27.5, swell_wave_height: 0.5, swell_wave_period: 6 },
          }),
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          current: { temperature_2m: 28.1, wind_speed_10m: 12.4, wind_direction_10m: 90 },
        }),
      } as any;
    }) as any;

    const res = await fetchWeatherSample(20.5, -86.9);
    expect(res.air_temp_c).toBe(28.1);
    expect(res.wind_kts).toBe(12.4);
    expect(res.wind_dir_deg).toBe(90);
    expect(res.water_temp_c).toBe(27.5);
    expect(res.swell_m).toBe(0.5);
    expect(res.swell_period_s).toBe(6);
    expect(typeof res.fetched_at).toBe('string');
  });

  test('handles nulls / missing fields gracefully', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ current: {} }),
    })) as any;

    const res = await fetchWeatherSample(20.5, -86.9);
    expect(res.air_temp_c).toBeNull();
    expect(res.wind_kts).toBeNull();
    expect(res.wind_dir_deg).toBeNull();
    expect(res.water_temp_c).toBeNull();
    expect(res.swell_m).toBeNull();
    expect(res.swell_period_s).toBeNull();
  });

  test('throws when either request fails', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({}),
    })) as any;

    await expect(fetchWeatherSample(20.5, -86.9)).rejects.toThrow(/Open-Meteo request failed/);
  });
});
