import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { LedgerRow } from '@/domain/ledger';
import { computeTrend, type Trend } from '@/domain/trend';
import type { Insights } from '@/hooks/useInsights';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-12',
  getToday: () => '2026-10-12',
}));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
let mockInsights: Insights;
jest.mock('@/hooks/useInsights', () => ({ useInsights: () => mockInsights }));
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const InsightsScreen = require('@/app/insights').default;

const OCT = { year: 2026, month: 10 };
const row = (type: 'income' | 'expense', date: string, amountCents: number): LedgerRow => ({
  type,
  amountCents,
  date,
  category: type === 'income' ? 'salary' : 'food',
});
const SIX_MONTHS = computeTrend(OCT, [
  row('income', '2026-05-01', 200_000),
  row('expense', '2026-05-02', 170_000),
  row('income', '2026-06-01', 200_000),
  row('expense', '2026-06-02', 170_000),
  row('expense', '2026-07-02', 40_000),
  row('income', '2026-08-01', 200_000),
  row('expense', '2026-08-02', 215_000),
  row('income', '2026-09-01', 200_000),
  row('expense', '2026-09-02', 170_000),
  row('income', '2026-10-01', 200_000),
  row('expense', '2026-10-02', 170_000),
]);

const month: { current: SelectedMonthValue | null } = { current: null };
function MonthSpy() {
  month.current = useSelectedMonth();
  return null;
}

function renderTrend(trend: Trend | null, status: Insights['status'] = trend ? 'ready' : 'loading') {
  mockInsights = { status, rows: [], pace: null, categories: null, trend, retry: jest.fn() };
  render(
    <SelectedMonthProvider>
      <MonthSpy />
      <InsightsScreen />
    </SelectedMonthProvider>,
  );
}

/** The default text matcher collapses whitespace, so es-ES's no-break space before the € matches. */
const text = (t: string) => screen.getByText(t);
const tap = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  mockFontScale = 1;
});

it('loading: the Savings trend title with a Loading indicator', () => {
  renderTrend(null);
  expect(screen.getByRole('header', { name: 'Savings trend' })).toBeTruthy();
  expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
});

it('every month without data: No data yet, no chart, no headline', () => {
  renderTrend(computeTrend(OCT, []));
  expect(text('No data yet')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'October' })).toBeNull();
  expect(screen.queryByText(/^Saved /)).toBeNull();
});

it.each<[string, LedgerRow[], string, string]>([
  ['six months', [], 'Saved 650,00 € in 6 months · 7%', 'Saved 650,00 € in 6 months, 7 percent'],
  [
    'one month without income',
    [row('expense', '2026-10-02', 40_000)],
    'Saved -400,00 € in 1 month · No income',
    'Saved minus 400,00 € in 1 month, no income',
  ],
])('headline: %s', (_name, rows, headline, label) => {
  renderTrend(rows.length ? computeTrend(OCT, rows) : SIX_MONTHS);
  expect(text(headline)).toBeTruthy();
  expect(screen.getByLabelText(label)).toBeTruthy();
});

it('a tap shows the month detail, another month replaces it, the same month hides it (FR-014)', () => {
  renderTrend(SIX_MONTHS);
  expect(screen.queryByText(/^Income: /)).toBeNull();

  tap('August');
  expect(text('Income: 2.000,00 €')).toBeTruthy();
  expect(text('Expenses: 2.150,00 €')).toBeTruthy();
  expect(text('Saved: -150,00 €')).toBeTruthy();
  expect(text('Savings rate: -8%')).toBeTruthy();

  tap('July');
  expect(screen.queryByText('Income: 2.000,00 €')).toBeNull();
  expect(text('Savings rate: No income')).toBeTruthy();

  tap('July');
  expect(screen.queryByText(/^Income: /)).toBeNull();
});

it('a month without data shows its name, No data and View month', () => {
  renderTrend(computeTrend(OCT, [row('income', '2026-10-01', 1_000)]));
  tap('June');
  expect(screen.getAllByText('June').length).toBeGreaterThan(0);
  expect(screen.getAllByText('No data').length).toBeGreaterThan(1);
  expect(screen.getByRole('button', { name: 'View month' })).toBeTruthy();
});

it('View month selects that month and closes the detail; it is absent on the selected month', () => {
  renderTrend(SIX_MONTHS);
  tap('October');
  expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();

  tap('August');
  const view = screen.getByRole('button', { name: 'View month' });
  expect(RN.StyleSheet.flatten(view.props.style).minHeight).toBeGreaterThanOrEqual(48);
  act(() => fireEvent.press(view));
  expect(month.current!.selected).toEqual({ year: 2026, month: 8 });
  expect(screen.queryByText(/^Income: /)).toBeNull();
});

it('at font scale 2 a 5.999.999.999,94 € headline is not cut', () => {
  mockFontScale = 2;
  const max = 99_999_999_999;
  const trend = computeTrend(
    OCT,
    [5, 6, 7, 8, 9, 10].map((m) => row('income', `2026-${String(m).padStart(2, '0')}-01`, max)),
  );
  renderTrend(trend);
  const headline = text('Saved 5.999.999.999,94 € in 6 months · 100%');
  expect(headline.props.numberOfLines).toBeUndefined();
  for (const t of screen.UNSAFE_getAllByType(RN.Text)) expect(t.props.numberOfLines).toBeUndefined();
});
