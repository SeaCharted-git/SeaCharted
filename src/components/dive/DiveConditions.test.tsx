/**
 * §4 spec: sky, wind, wind direction, moon phase; underwater — current strength,
 * current direction, visibility, water temperature.
 *
 * These component tests render DiveConditions and assert all §4 fields appear
 * (either in read mode or in edit mode), plus that the moon-phase label is
 * derived from dive_date when the dive has no stored moon_phase.
 *
 * NOTE: @testing-library/react-native v14 uses an async render().
 */
jest.mock('@/lib/supabase/client');

// eslint-disable-next-line import/first
import { fireEvent, render } from '@testing-library/react-native';
// eslint-disable-next-line import/first
import { DiveConditions } from './DiveConditions';
// eslint-disable-next-line import/first
import { computeMoonPhase, moonPhaseLabel } from '@/lib/dives/moon';
// eslint-disable-next-line import/first
import type { Dive } from '@/lib/types';

const mock = require('@/lib/supabase/client') as typeof import('@/lib/supabase/__mocks__/client');
const { __reset } = mock;

beforeEach(() => __reset());

const emptyDive = (over: Partial<Dive> = {}): Dive => ({
  id: 'd1',
  user_id: 'u1',
  site_id: 's1',
  dive_date: '2026-06-15',
  max_depth_m: null,
  duration_min: null,
  buddy_name: null,
  notes: null,
  is_public: false,
  created_at: '2026-06-15T00:00:00Z',
  sky: null,
  wind_kts: null,
  wind_dir: null,
  moon_phase: null,
  current_strength: null,
  current_direction: null,
  visibility_m: null,
  water_temp_c_observed: null,
  cover_photo_id: null,
  ...over,
});

describe('DiveConditions — read mode', () => {
  test('renders the section title', async () => {
    const { getByText } = await render(<DiveConditions dive={emptyDive()} onUpdated={() => {}} />);
    expect(getByText('Conditions')).toBeTruthy();
  });

  test('derives moon phase label from dive_date when moon_phase is null (§4)', async () => {
    const dive = emptyDive({ dive_date: '2026-06-15' });
    const expected = moonPhaseLabel(computeMoonPhase('2026-06-15'));
    const { getByText } = await render(<DiveConditions dive={dive} onUpdated={() => {}} />);
    expect(getByText(new RegExp(expected))).toBeTruthy();
  });

  test('uses stored moon_phase when present', async () => {
    const dive = emptyDive({ moon_phase: 0.5 });
    const { getByText } = await render(<DiveConditions dive={dive} onUpdated={() => {}} />);
    expect(getByText(new RegExp('Full moon'))).toBeTruthy();
  });

  test('shows "not filled in" hint when no conditions are set', async () => {
    const { getByText } = await render(<DiveConditions dive={emptyDive()} onUpdated={() => {}} />);
    expect(getByText(/not filled in/i)).toBeTruthy();
  });

  test('renders sky, wind, current, visibility, temp when set (all §4 fields)', async () => {
    const dive = emptyDive({
      sky: 'sunny',
      wind_kts: 8,
      wind_dir: 'NE',
      current_strength: 'moderate',
      current_direction: 'normal_s_to_n',
      visibility_m: 30,
      water_temp_c_observed: 27,
    });
    const { getByText } = await render(<DiveConditions dive={dive} onUpdated={() => {}} />);
    expect(getByText(/sunny/i)).toBeTruthy();
    expect(getByText(/8 kts/)).toBeTruthy();
    expect(getByText(/moderate/i)).toBeTruthy();
    expect(getByText(/30 m/)).toBeTruthy();
    expect(getByText(/27 °C/)).toBeTruthy();
  });
});

describe('DiveConditions — edit mode reveals every §4 field', () => {
  test('tapping Edit reveals all §4 field labels', async () => {
    const { getByText, queryByText } = await render(
      <DiveConditions dive={emptyDive()} onUpdated={() => {}} />,
    );
    await fireEvent.press(getByText('Edit'));
    // All four outside labels per spec:
    expect(getByText('Sky')).toBeTruthy();
    expect(getByText('Wind (kts)')).toBeTruthy();
    expect(getByText('Wind direction')).toBeTruthy();
    // All four underwater labels per spec:
    expect(getByText('Current strength')).toBeTruthy();
    expect(getByText('Current direction')).toBeTruthy();
    expect(getByText('Visibility (m)')).toBeTruthy();
    expect(getByText(/Water temp/)).toBeTruthy();
    expect(queryByText('Cancel')).toBeTruthy();
    expect(queryByText('Save')).toBeTruthy();
  });

  test('Cancel exits edit mode without saving', async () => {
    const onUpdated = jest.fn();
    const { getByText, queryByText } = await render(
      <DiveConditions dive={emptyDive()} onUpdated={onUpdated} />,
    );
    await fireEvent.press(getByText('Edit'));
    await fireEvent.press(getByText('Cancel'));
    expect(queryByText('Save')).toBeNull();
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
