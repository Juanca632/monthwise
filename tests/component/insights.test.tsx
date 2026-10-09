import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { LedgerRow } from '@/domain/ledger';
import { computePace, type Pace } from '@/domain/pace';
import type { Insights } from '@/hooks/useInsights';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { palettes } from '@/ui/theme';

import { touchPaceChart } from '../helpers/paceGesture';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-12',
  getToday: () => '2026-10-12',
}));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
// Like the other component suites: the real expo-font needs expo-asset, which Jest cannot resolve.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
// The screen's data comes from the hook, tested on its own (useInsights.test.tsx).
let mockInsights: Insights;
jest.mock('@/hooks/useInsights', () => ({ useInsights: () => mockInsights }));
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const InsightsScreen = require('@/app/insights').default;

const OCT = { year: 2026, month: 10 };
const expense = (date: string, amountCents: number): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});
const PACE: Pace = computePace(
  OCT,
  [expense('2026-10-02', 7_000), expense('2026-10-08', 5_000)],
  [expense('2026-09-04', 10_000)],
  '2026-10-12',
);
const dayX = (day: number) => (day - 0.5) * 10;
/** The default text matcher collapses whitespace, so es-ES's no-break space before the € matches. */
const text = (t: string) => screen.getByText(t);

const month: { current: SelectedMonthValue | null } = { current: null };
function MonthSpy() {
  month.current = useSelectedMonth();
  return null;
}

function renderInsights(insights: Partial<Insights> = {}) {
  mockInsights = { status: 'ready', rows: [], pace: PACE, categories: null, trend: null, retry: jest.fn(), ...insights };
  const view = render(
    <SelectedMonthProvider>
      <MonthSpy />
      <InsightsScreen />
    </SelectedMonthProvider>,
  );
  const chart = screen.queryByTestId('pace-chart');
  if (chart) {
    fireEvent(chart, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 310, height: 180 } } });
  }
  return view;
}

beforeEach(() => {
  mockBack.mockClear();
  mockFontScale = 1;
  jest.restoreAllMocks();
});

describe('Insights header', () => {
  it('names the screen, shows the selected month, and goes back', () => {
    renderInsights();
    expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'October 2026' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('Insights states', () => {
  it('loading: each section title with a Loading indicator', () => {
    renderInsights({ status: 'loading', pace: null });
    for (const title of ['Spending pace', 'Categories vs last month', 'Savings trend']) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
  });

  it('loading with a handed pace: the pace section is drawn, the others load', () => {
    renderInsights({ status: 'loading' });
    expect(text('20,00 € more than last month by day 12')).toBeTruthy();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(2);
  });

  it('error: the message and Try again instead of the sections', () => {
    const retry = jest.fn();
    renderInsights({ status: 'error', pace: null, retry });
    expect(text("Couldn't load your data.")).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Spending pace' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('ready: the three section titles and the pace sentence', () => {
    renderInsights();
    for (const title of ['Spending pace', 'Categories vs last month', 'Savings trend']) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    expect(text('20,00 € more than last month by day 12')).toBeTruthy();
  });

  it('offers no way to add, edit or delete (FR-015)', () => {
    renderInsights();
    expect(screen.queryByRole('button', { name: /^(Add|Edit|Delete)/i })).toBeNull();
    expect(screen.queryByText(/^(Add|Edit|Delete)$/i)).toBeNull();
  });
});

describe('Pace day detail (FR-007, FR-014)', () => {
  it('a tap shows the day, another day replaces it, the same day hides it', async () => {
    renderInsights();
    expect(screen.queryByText(/^Day \d+$/)).toBeNull();

    await touchPaceChart([{ x: dayX(8) }]);
    expect(text('Day 8')).toBeTruthy();
    expect(text('October: 120,00 €')).toBeTruthy();
    expect(text('September: 100,00 €')).toBeTruthy();
    expect(text('+20,00 € · +20%')).toBeTruthy();

    await touchPaceChart([{ x: dayX(3) }]);
    expect(screen.queryByText('Day 8')).toBeNull();
    expect(text('Day 3')).toBeTruthy();

    await touchPaceChart([{ x: dayX(3) }]);
    expect(screen.queryByText(/^Day \d+$/)).toBeNull();
  });

  it('a drag leaves the lift day selected', async () => {
    renderInsights();
    await touchPaceChart([{ x: dayX(1) }, { x: dayX(4) }, { x: dayX(6) }]);
    expect(text('Day 6')).toBeTruthy();
  });

  it('a month change hides the detail (FR-031)', async () => {
    renderInsights();
    await touchPaceChart([{ x: dayX(8) }]);
    expect(text('Day 8')).toBeTruthy();
    act(() => month.current!.setSelected({ year: 2026, month: 9 }));
    expect(screen.queryByText(/^Day \d+$/)).toBeNull();
  });
});

describe('Insights month control (FR-026, FR-031)', () => {
  it('choosing a month on Insights changes the shared month and hides the open detail', async () => {
    renderInsights();
    await touchPaceChart([{ x: dayX(8) }]);
    expect(text('Day 8')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'October 2026' }));
    act(() => fireEvent.press(screen.getByRole('button', { name: 'August 2026' })));
    expect(month.current!.selected).toEqual({ year: 2026, month: 8 });
    expect(screen.getByRole('button', { name: 'August 2026' })).toBeTruthy();
    expect(screen.queryByText(/^Day \d+$/)).toBeNull();
  });
});

describe('Insights look', () => {
  it('uses the dark palette in dark mode', () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    renderInsights();
    const backgrounds = screen
      .UNSAFE_getAllByType(RN.View)
      .map((v) => RN.StyleSheet.flatten(v.props.style)?.backgroundColor)
      .filter(Boolean);
    expect(backgrounds).toContain(palettes.dark.background);
    expect(backgrounds).toContain(palettes.dark.surface);
  });

  it('at font scale 2 nothing is cut: no text has numberOfLines', async () => {
    mockFontScale = 2;
    renderInsights();
    await touchPaceChart([{ x: dayX(8) }]);
    for (const t of screen.UNSAFE_getAllByType(RN.Text)) {
      expect(t.props.numberOfLines).toBeUndefined();
    }
  });
});
