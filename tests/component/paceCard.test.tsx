import { fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { LedgerRow } from '@/domain/ledger';
import { computePace, type Pace } from '@/domain/pace';
import { PaceCard } from '@/ui/PaceCard';
import { minTouch, palettes } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const OCT = { year: 2026, month: 10 };
const SEP = { year: 2026, month: 9 };
const TODAY = '2026-10-12';
const expense = (date: string, amountCents: number): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});
/** es-ES puts a no-break space before the €. */
const nbsp = (text: string) => text.replace(/ €/g, ' €');

const pace = (selected: LedgerRow[], previous: LedgerRow[], month = OCT): Pace =>
  computePace(month, selected, previous, TODAY);

function renderReady(p: Pace, onPress = jest.fn()) {
  render(<PaceCard tag="es-ES" content={{ kind: 'ready', pace: p, onPress }} />);
  return onPress;
}

beforeEach(() => {
  mockFontScale = 1;
  jest.restoreAllMocks();
});

describe('PaceCard, loading', () => {
  it('shows the title and a Loading indicator, and is not a button', () => {
    render(<PaceCard tag="es-ES" content={{ kind: 'loading' }} />);
    expect(screen.getByText('Spending pace')).toBeTruthy();
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('PaceCard, ready', () => {
  it('is one button with the sentence in its label and the Opens Insights hint', () => {
    const onPress = renderReady(pace([expense('2026-10-05', 18_500)], [expense('2026-09-03', 10_000)]));
    const card = screen.getByRole('button', {
      name: nbsp('Spending pace, 85,00 € more than last month by day 12'),
    });
    expect(card.props.accessibilityHint).toBe('Opens Insights');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows its small title inside the card, and hides the card parts from the screen reader', () => {
    renderReady(pace([expense('2026-10-05', 18_500)], [expense('2026-09-03', 10_000)]));
    // The card's label starts with the title, so the title is not a separate element.
    expect(screen.queryByText('Spending pace')).toBeNull();
    expect(screen.getByText('Spending pace', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/more than last month/)).toBeNull();
    expect(screen.getByText(/more than last month/, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it.each([
    ['no spending', [], [], 'No spending to compare yet'],
    ['no previous data, current month', [expense('2026-10-05', 1_000)], [], 'No data from last month to compare'],
    ['more', [expense('2026-10-05', 18_500)], [expense('2026-09-03', 10_000)], '85,00 € more than last month by day 12'],
    ['less', [expense('2026-10-05', 3_500)], [expense('2026-09-03', 10_000)], '65,00 € less than last month by day 12'],
    ['same', [expense('2026-10-05', 10_000)], [expense('2026-09-03', 10_000)], 'Same as last month by day 12'],
  ])('shows the FR-003 sentence: %s', (_name, selected, previous, sentence) => {
    renderReady(pace(selected, previous));
    expect(screen.getByText(nbsp(sentence), { includeHiddenElements: true })).toBeTruthy();
  });

  it('names a past month against its previous month', () => {
    renderReady(pace([expense('2026-09-05', 1_000)], [], SEP));
    expect(screen.getByText('No data from August to compare', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is at least 48 dp tall', () => {
    renderReady(pace([], []));
    const style = RN.StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(minTouch);
  });

  it('uses the dark palette in dark mode', () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    renderReady(pace([], []));
    const style = RN.StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.backgroundColor).toBe(palettes.dark.surface);
  });

  it('wraps a 999.999.999,99 € difference at font scale 2; nothing is cut', () => {
    mockFontScale = 2;
    renderReady(pace([expense('2026-10-05', 100_000_000_000)], [expense('2026-09-03', 1)]));
    const sentence = screen.getByText(nbsp('999.999.999,99 € more than last month by day 12'), {
      includeHiddenElements: true,
    });
    expect(sentence.props.numberOfLines).toBeUndefined();
    for (const text of screen.UNSAFE_getAllByType(RN.Text)) {
      expect(text.props.numberOfLines).toBeUndefined();
    }
  });
});

it('colors the answer: more in the error color, less in the income color', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');
  renderReady(pace([expense('2026-10-05', 18_500)], [expense('2026-09-03', 10_000)]));
  const more = screen.getByText(nbsp('85,00 € more'), { includeHiddenElements: true });
  expect(RN.StyleSheet.flatten(more.props.style).color).toBe(palettes.light.error);
});

it('colors less in the income color', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');
  renderReady(pace([expense('2026-10-05', 3_500)], [expense('2026-09-03', 10_000)]));
  const less = screen.getByText(nbsp('65,00 € less'), { includeHiddenElements: true });
  expect(RN.StyleSheet.flatten(less.props.style).color).toBe(palettes.light.income);
});
