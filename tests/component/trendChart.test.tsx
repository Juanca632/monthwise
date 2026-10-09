import { fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { LedgerRow } from '@/domain/ledger';
import { computeTrend } from '@/domain/trend';
import { TrendChart } from '@/ui/charts/TrendChart';
import { minTouch, palettes } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
let mockReduceMotion = true;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const OCT = { year: 2026, month: 10 };
const row = (type: 'income' | 'expense', date: string, amountCents: number): LedgerRow => ({
  type,
  amountCents,
  date,
  category: type === 'income' ? 'salary' : 'food',
});
// June has no data; August spent more than it earned.
const ROWS = [
  row('income', '2026-05-01', 100_000),
  row('income', '2026-07-01', 100_000),
  row('income', '2026-08-01', 200_000),
  row('expense', '2026-08-02', 215_000),
  row('income', '2026-09-01', 200_000),
  row('expense', '2026-09-02', 170_000),
  row('income', '2026-10-01', 100_000),
  row('expense', '2026-10-02', 100_000),
];
const TREND = computeTrend(OCT, ROWS);

function renderChart(selectedIndex: number | null = null, reveal = false) {
  const onActivate = jest.fn();
  render(
    <TrendChart trend={TREND} tag="es-ES" screenMonth={OCT} selectedIndex={selectedIndex} onActivate={onActivate} reveal={reveal} />,
  );
  // Jest has no layout; the bars need the chart's width.
  fireEvent(screen.getByRole('button', { name: 'May' }).parent!.parent!, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
  });
  return onActivate;
}

const flat = (node: { props: { [key: string]: unknown } }) =>
  RN.StyleSheet.flatten(node.props.style as RN.StyleProp<RN.ViewStyle>);

beforeEach(() => {
  mockReduceMotion = true;
  jest.restoreAllMocks();
});

it('has one button per month, May to October, with its spoken value', () => {
  const onActivate = renderChart();
  const names = ['May', 'June', 'July', 'August', 'September', 'October'];
  for (const name of names) expect(screen.getByRole('button', { name })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'September' }).props.accessibilityValue.text.replace(/ /g, ' ')).toBe(
    'Income 2.000,00 €, expenses 1.700,00 €, saved 300,00 €, savings rate 15 percent',
  );
  expect(screen.getByRole('button', { name: 'June' }).props.accessibilityValue.text).toBe('No data');
  fireEvent.press(screen.getByRole('button', { name: 'August' }));
  expect(onActivate).toHaveBeenCalledWith(3);
});

it('marks the open month as selected', () => {
  renderChart(4);
  expect(screen.getByRole('button', { name: 'September' }).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByRole('button', { name: 'October' }).props.accessibilityState).toMatchObject({ selected: false });
});

it('draws a negative month below the zero line in the error color, a positive one above it', () => {
  renderChart();
  const bars = screen.getAllByTestId('trend-bar', { includeHiddenElements: true }).map(flat);
  // May, July, August, September, October have data; June does not, so it draws no bar.
  expect(bars).toHaveLength(5);
  const [, , august, september] = bars;
  // September grows up to the zero line; August hangs from it.
  const zero = Number(september.top) + Number(september.height);
  expect(september.backgroundColor).toBe(palettes.light.chartCurrent);
  expect(august.backgroundColor).toBe(palettes.light.error);
  expect(Number(august.top)).toBe(zero);
  expect(Number(august.height)).toBeGreaterThan(0);
});

it('draws a month that saved exactly 0 as a line on the zero line', () => {
  renderChart();
  const october = screen.getAllByTestId('trend-bar', { includeHiddenElements: true }).map(flat)[4];
  expect(october.height).toBe(2);
});

it('writes No data in a month without data, never a zero', () => {
  renderChart();
  expect(screen.getByText('No data')).toBeTruthy();
});

it('every column is at least 48 dp wide', () => {
  renderChart();
  for (const name of ['May', 'October']) {
    expect(flat(screen.getByRole('button', { name })).minWidth).toBeGreaterThanOrEqual(minTouch);
  }
});

it('does not grow the bars with reduce motion', () => {
  renderChart(null, true);
  expect(flat(screen.getByTestId('trend-bars', { includeHiddenElements: true })).transform).toEqual([{ scaleY: 1 }]);
});

it('grows the bars from zero on reveal with motion on', () => {
  mockReduceMotion = false;
  renderChart(null, true);
  expect(flat(screen.getByTestId('trend-bars', { includeHiddenElements: true })).transform).toEqual([{ scaleY: 0 }]);
});

it('uses the dark palette in dark mode', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  renderChart();
  const colors = screen.getAllByTestId('trend-bar', { includeHiddenElements: true }).map((b) => flat(b).backgroundColor);
  expect(colors).toContain(palettes.dark.chartCurrent);
  expect(colors).toContain(palettes.dark.error);
});
