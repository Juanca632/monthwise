import { render, screen, within } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { CategoryComparison } from '@/domain/categoryChanges';
import { CategoryChanges } from '@/ui/CategoryChanges';
import { palettes } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const OCT = { year: 2026, month: 10 };
const AUG = { year: 2026, month: 8 };
const SEP = { year: 2026, month: 9 };
const JUL = { year: 2026, month: 7 };

const currentChanges: CategoryComparison = {
  kind: 'changes',
  comparisonDay: 12,
  rows: [
    { category: 'food', currentCents: 10_000, previousCents: 9_000, changeCents: 1_000, percent: { rounded: 11, sign: 1 } },
  ],
};
const pastChanges: CategoryComparison = {
  kind: 'changes',
  comparisonDay: null,
  rows: [
    { category: 'food', currentCents: 26_000, previousCents: 20_000, changeCents: 6_000, percent: { rounded: 30, sign: 1 } },
    { category: 'leisure', currentCents: 4_000, previousCents: 0, changeCents: 4_000, percent: 'new' },
    { category: 'transport', currentCents: 5_000, previousCents: 8_000, changeCents: -3_000, percent: { rounded: -38, sign: -1 } },
  ],
};

const renderCard = (comparison: CategoryComparison | null, selected = OCT) =>
  render(<CategoryChanges comparison={comparison} selected={selected} tag="es-ES" />);
/** Full-text matches collapse whitespace, so es-ES's no-break space before the € matches. */
const row = (label: string | RegExp) => screen.getByLabelText(label);

beforeEach(() => {
  mockFontScale = 1;
  jest.restoreAllMocks();
});

it('loading: a Loading indicator', () => {
  renderCard(null);
  expect(screen.getByLabelText('Loading')).toBeTruthy();
});

it('no spending: the sentence, no rows, no Compared by label', () => {
  renderCard({ kind: 'noSpending' });
  expect(screen.getByText('No spending to compare yet')).toBeTruthy();
  expect(screen.queryByText(/Compared by/)).toBeNull();
  expect(screen.queryByText(/ vs /, { includeHiddenElements: true })).toBeNull();
});

it('current month: Compared by day 12, no column titles, one element per row with its change', () => {
  renderCard(currentChanges);
  expect(screen.getByText('Compared by day 12')).toBeTruthy();
  for (const title of ['This month', 'Last month', 'Change']) {
    expect(screen.queryByText(title, { includeHiddenElements: true })).toBeNull();
  }
  const food = row('Food, this month 100,00 €, last month 90,00 €, plus 10,00 €, plus 11 percent');
  expect(food.props.accessible).toBe(true);
  expect(food.props.accessibilityRole).toBeUndefined();
  const inside = within(food);
  expect(inside.getByText('Food', { includeHiddenElements: true })).toBeTruthy();
  expect(inside.getByText('100,00 €', { includeHiddenElements: true })).toBeTruthy();
  expect(inside.getByText('+10,00 € vs last month', { includeHiddenElements: true })).toBeTruthy();
  expect(inside.getByText('+11%', { includeHiddenElements: true })).toBeTruthy();
  // Last month's amount is only spoken (FR-008).
  expect(inside.queryByText('90,00 €', { includeHiddenElements: true })).toBeNull();
});

it('past month: the change line names the previous month; New and minus in the labels', () => {
  renderCard(pastChanges, AUG);
  expect(screen.queryByText(/Compared by/)).toBeNull();
  expect(screen.getByText('+60,00 € vs July', { includeHiddenElements: true })).toBeTruthy();
  expect(row('Leisure, August 40,00 €, July 0,00 €, plus 40,00 €, new')).toBeTruthy();
  expect(row('Transport, August 50,00 €, July 80,00 €, minus 30,00 €, minus 38 percent')).toBeTruthy();
  expect(screen.getByText('New', { includeHiddenElements: true })).toBeTruthy();
});

it('no data last month: the sentence and this month only, no change line', () => {
  renderCard({ kind: 'noPreviousData', previousMonth: SEP, isCurrent: true, rows: [{ category: 'food', amountCents: 26_000 }] });
  expect(screen.getByText('No data from last month to compare')).toBeTruthy();
  expect(screen.queryByText(/Compared by/)).toBeNull();
  expect(screen.queryByText(/ vs /, { includeHiddenElements: true })).toBeNull();
  expect(row('Food, this month 260,00 €')).toBeTruthy();
});

it('no data from a named month for a past month', () => {
  renderCard({ kind: 'noPreviousData', previousMonth: JUL, isCurrent: false, rows: [{ category: 'food', amountCents: 26_000 }] }, AUG);
  expect(screen.getByText('No data from July to compare')).toBeTruthy();
  expect(row('Food, August 260,00 €')).toBeTruthy();
});

it('rows are not tappable', () => {
  renderCard(pastChanges, AUG);
  expect(screen.queryByRole('button')).toBeNull();
});

it('at font scale 2 with 999.999.999,99 € rows nothing is cut: texts wrap', () => {
  mockFontScale = 2;
  renderCard({
    kind: 'changes',
    comparisonDay: 12,
    rows: [
      {
        category: 'food',
        currentCents: 99_999_999_999,
        previousCents: 1,
        changeCents: 99_999_999_998,
        percent: { rounded: 9_999_999_999_800, sign: 1 },
      },
    ],
  });
  expect(row(/^Food, this month 999\.999\.999,99/)).toBeTruthy();
  for (const t of screen.UNSAFE_getAllByType(RN.Text)) expect(t.props.numberOfLines).toBeUndefined();
});

it('uses the dark palette in dark mode', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  renderCard(currentChanges);
  const backgrounds = screen
    .UNSAFE_getAllByType(RN.View)
    .map((v) => RN.StyleSheet.flatten(v.props.style)?.backgroundColor);
  expect(backgrounds).toContain(palettes.dark.surface);
});
