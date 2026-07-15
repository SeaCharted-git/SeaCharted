/**
 * PillSelect is the core picker for §1 profile pills, §3 species categories,
 * §4 weather conditions. These tests exercise render + selection + clear.
 *
 * @testing-library/react-native v14 uses an async render() — see the awaits below.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { PillSelect } from './PillSelect';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

describe('PillSelect', () => {
  test('renders every option label', async () => {
    const { getByText } = await render(
      <PillSelect value={null} onChange={() => {}} options={OPTIONS} />,
    );
    expect(getByText('Alpha')).toBeTruthy();
    expect(getByText('Bravo')).toBeTruthy();
    expect(getByText('Charlie')).toBeTruthy();
  });

  test('fires onChange with the selected value when a pill is pressed', async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <PillSelect value={null} onChange={onChange} options={OPTIONS} />,
    );
    await fireEvent.press(getByText('Bravo'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('pressing the selected pill again clears when allowClear=true', async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <PillSelect value="b" onChange={onChange} options={OPTIONS} allowClear />,
    );
    await fireEvent.press(getByText('Bravo'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test('pressing the selected pill again keeps selection when allowClear is not set', async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <PillSelect value="b" onChange={onChange} options={OPTIONS} />,
    );
    await fireEvent.press(getByText('Bravo'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('switching from one selection to another fires onChange with the new value', async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <PillSelect value="a" onChange={onChange} options={OPTIONS} />,
    );
    await fireEvent.press(getByText('Charlie'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  test('renders zero options without crashing', async () => {
    const { queryByText } = await render(
      <PillSelect value={null} onChange={() => {}} options={[]} />,
    );
    expect(queryByText('Alpha')).toBeNull();
  });
});
