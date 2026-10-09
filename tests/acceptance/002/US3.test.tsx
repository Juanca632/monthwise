// Acceptance tests for 002 User Story 3: the "Savings trend" section on Insights.
// Black box: only specs/002-monthly-charts/spec.md and contracts/ were read.
// Region is es-ES (the harness default), so amounts read like `1.800,00 €`.
// The bars themselves are visual (not testable here); the texts, month buttons, details and
// "View month" are.
import { fireEvent, screen } from '@testing-library/react-native';

// The harness installs its mocks on import: keep it before any '@/...' module.
import { renderApp, type AppHandle } from '../../helpers/app';
import type { TransactionInput } from '@/domain/validation';

const expense = (date: string, amountCents: number, category = 'food'): TransactionInput =>
  ({ type: 'expense', amountCents, date, category, note: null }) as TransactionInput;
const income = (date: string, amountCents: number, category = 'salary'): TransactionInput =>
  ({ type: 'income', amountCents, date, category, note: null }) as TransactionInput;

/** Exact-text matcher tolerant of what the spec leaves to the region (see US1 for the reasoning). */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const t = (s: string) =>
  new RegExp(
    '^' +
      esc(s)
        .replace(/ /g, '[\\s\\u00A0\\u202F]')
        .replace(/\\\./g, '\\.?')
        .replace(/-/g, '[-\\u2212]') +
      '$',
  );

let app: AppHandle;

async function openInsights() {
  fireEvent.press(screen.getByRole('button', { name: /^Spending pace, / }));
  await app.settle();
}

/** Opens Insights for the current month (October 2026, today the 12th). */
async function openOctober(transactions: TransactionInput[]) {
  app = await renderApp({ today: '2026-10-12', transactions });
  await openInsights();
}

/** [year-month, income cents, expense cents]; a 0 means no transaction of that type. */
type MonthRow = [string, number, number];
const rows = (list: MonthRow[]): TransactionInput[] =>
  list.flatMap(([ym, inc, exp]) => [
    ...(inc > 0 ? [income(`${ym}-01`, inc)] : []),
    ...(exp > 0 ? [expense(`${ym}-05`, exp)] : []),
  ]);

// Hand-worked reference: income 12,000.00 and expenses 10,200.00 over May to October 2026.
//   May   2.000 / 1.800 -> saved   200
//   Jun   2.000 / 1.500 -> saved   500
//   Jul   2.000 / 1.500 -> saved   500
//   Aug   2.000 / 2.150 -> saved  -150  (-7.5% -> -8%)
//   Sep   2.000 / 1.700 -> saved   300  (15%)
//   Oct   2.000 / 1.550 -> saved   450
// Total saved 1.800,00 (1800 / 12000 = 15%).
const BASE: MonthRow[] = [
  ['2026-05', 200_000, 180_000],
  ['2026-06', 200_000, 150_000],
  ['2026-07', 200_000, 150_000],
  ['2026-08', 200_000, 215_000],
  ['2026-09', 200_000, 170_000],
  ['2026-10', 200_000, 155_000],
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Names of the trend's month buttons, in the order they appear on screen. */
const trendMonths = () =>
  screen
    .getAllByRole('button')
    .map((b) => String(b.props.accessibilityLabel))
    .filter((l) => MONTH_NAMES.includes(l));

const monthButton = (name: string) => screen.getByRole('button', { name });
const tapMonth = (name: string) => fireEvent.press(monthButton(name));
const accessibleValue = (name: string) =>
  monthButton(name).props.accessibilityValue?.text as string | undefined;

/** Month detail lines are the only texts starting with these prefixes. */
const detailOpen = () => screen.queryAllByText(/^Income: /).length > 0;

describe('US3: savings trend', () => {
  describe('acceptance scenarios', () => {
    it('US3-AS1: the trend shows May to October in calendar order for October', async () => {
      await openOctober(rows(BASE));
      expect(trendMonths()).toEqual(['May', 'June', 'July', 'August', 'September', 'October']);
      expect(screen.getByRole('header', { name: 'Savings trend' })).toBeTruthy();
    });

    it('US3-AS2: income 12.000,00 € and expenses 10.200,00 € give "Saved 1.800,00 € in 6 months · 15%"', async () => {
      await openOctober(rows(BASE));
      expect(screen.getByText(t('Saved 1.800,00 € in 6 months · 15%'))).toBeTruthy();
      expect(screen.getByLabelText(t('Saved 1.800,00 € in 6 months, 15 percent'))).toBeTruthy();
    });

    it('US3-AS3: tapping September shows its income, expenses, saved amount and savings rate', async () => {
      await openOctober(rows(BASE));
      const before = screen.getAllByText('September').length; // the pace legend names September too
      tapMonth('September');
      expect(screen.getAllByText('September')).toHaveLength(before + 1);
      expect(screen.getByText(t('Income: 2.000,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Expenses: 1.700,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Saved: 300,00 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: 15%')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'View month' })).toBeTruthy();
      // Still on Insights.
      expect(app.screen).toBe('insights');
    });

    it('US3-AS4: August (2.000,00 income, 2.150,00 expenses) shows "Saved: -150,00 €" and "Savings rate: -8%"', async () => {
      await openOctober(rows(BASE));
      tapMonth('August');
      expect(screen.getByText('August')).toBeTruthy();
      expect(screen.getByText(t('Income: 2.000,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Expenses: 2.150,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Saved: -150,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Savings rate: -8%'))).toBeTruthy();
    });

    it('US3-AS5: July with expenses 400,00 and no income shows "Saved: -400,00 €" and "Savings rate: No income"', async () => {
      await openOctober(
        rows([
          ['2026-05', 200_000, 180_000],
          ['2026-06', 200_000, 150_000],
          ['2026-07', 0, 40_000],
          ['2026-08', 200_000, 215_000],
          ['2026-09', 200_000, 170_000],
          ['2026-10', 200_000, 155_000],
        ]),
      );
      tapMonth('July');
      expect(screen.getByText(t('Income: 0,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Expenses: 400,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Saved: -400,00 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: No income')).toBeTruthy();
    });

    it('US3-AS6: a month with no data is an empty column (value "No data", no visible text), and tapping it shows its name, "No data" and "View month"', async () => {
      // June has no transactions at all.
      await openOctober(rows(BASE.filter(([ym]) => ym !== '2026-06')));
      expect(screen.queryByText('No data')).toBeNull();
      expect(accessibleValue('June')).toBe('No data');
      expect(screen.queryByText(/^Income: /)).toBeNull();
      tapMonth('June');
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getAllByText('No data')).toHaveLength(1); // only the detail line
      expect(screen.queryByText(/^(Income|Expenses|Saved|Savings rate): /)).toBeNull();
      expect(screen.getByRole('button', { name: 'View month' })).toBeTruthy();
    });

    it('US3-AS6: a selected month with no data shows its name and "No data" but no "View month"', async () => {
      // October (selected) has no data; September has.
      await openOctober(rows([['2026-09', 100_000, 90_000]]));
      tapMonth('October');
      expect(screen.getAllByText('No data')).toHaveLength(1); // only the detail line
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
    });

    it('US3-AS7: February 2000 selected with data in January and February shows only those two, "in 2 months"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: rows([
          ['2000-01', 100_000, 60_000],
          ['2000-02', 100_000, 80_000],
        ]),
      });
      await app.selectMonth({ year: 2000, month: 2 });
      await openInsights();
      expect(trendMonths()).toEqual(['January', 'February']);
      // Saved 400,00 + 200,00 = 600,00 of 2.000,00 income = 30%.
      expect(screen.getByText(t('Saved 600,00 € in 2 months · 30%'))).toBeTruthy();
    });

    it('US3-AS7: with January 2000 selected the trend shows only January and says "in 1 month"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: rows([
          ['2000-01', 100_000, 60_000],
          ['2000-02', 100_000, 80_000],
        ]),
      });
      await app.selectMonth({ year: 2000, month: 1 });
      await openInsights();
      expect(trendMonths()).toEqual(['January']);
      expect(screen.getByText(t('Saved 400,00 € in 1 month · 40%'))).toBeTruthy();
    });

    it('US3-AS8: only September and October with data show May to August as empty columns (value "No data") and "Saved 300,00 € in 2 months · 10%"', async () => {
      await openOctober(
        rows([
          ['2026-09', 100_000, 90_000],
          ['2026-10', 200_000, 180_000],
        ]),
      );
      expect(trendMonths()).toEqual(['May', 'June', 'July', 'August', 'September', 'October']);
      expect(screen.queryByText('No data')).toBeNull();
      for (const m of ['May', 'June', 'July', 'August']) expect(accessibleValue(m)).toBe('No data');
      expect(accessibleValue('September')).not.toBe('No data');
      expect(accessibleValue('October')).not.toBe('No data');
      expect(screen.getByText(t('Saved 300,00 € in 2 months · 10%'))).toBeTruthy();
    });

    it('US3-AS9: only October with expenses 400,00 and no income reads "Saved -400,00 € in 1 month · No income"', async () => {
      await openOctober([expense('2026-10-05', 40_000)]);
      expect(screen.getByText(t('Saved -400,00 € in 1 month · No income'))).toBeTruthy();
      expect(screen.getByLabelText(t('Saved minus 400,00 € in 1 month, no income'))).toBeTruthy();
    });

    it('US3-AS10: no detail on open; August then September replaces; September again hides', async () => {
      await openOctober(rows(BASE));
      expect(detailOpen()).toBe(false);

      tapMonth('August');
      expect(screen.getByText(t('Saved: -150,00 €'))).toBeTruthy();

      tapMonth('September');
      expect(screen.getAllByText(/^Income: /)).toHaveLength(1);
      expect(screen.getByText(t('Saved: 300,00 €'))).toBeTruthy();
      expect(screen.queryByText(t('Saved: -150,00 €'))).toBeNull();
      expect(screen.queryByText('August')).toBeNull();

      tapMonth('September');
      expect(detailOpen()).toBe(false);
      expect(screen.queryByText(/^Saved: /)).toBeNull();
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
    });
  });

  describe('functional requirements', () => {
    it('FR-012: when every month shown has no data it shows "No data yet" and no chart or headline', async () => {
      // Data exists, but outside May to October 2026.
      await openOctober(rows([['2025-01', 100_000, 50_000]]));
      expect(screen.getByText('No data yet')).toBeTruthy();
      expect(screen.queryByText(/^Saved .* in \d+ months?/)).toBeNull();
      expect(trendMonths()).toEqual([]);
      expect(screen.queryByText('No data')).toBeNull();
    });

    it('FR-012: a month with income and no expenses is a month with data (expenses 0,00 €, not "No data")', async () => {
      await openOctober([income('2026-10-02', 100_000)]);
      expect(screen.getByText(t('Saved 1.000,00 € in 1 month · 100%'))).toBeTruthy();
      tapMonth('October');
      expect(screen.getByText(t('Expenses: 0,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Saved: 1.000,00 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: 100%')).toBeTruthy();
    });

    it('FR-012: the overall rate rounds half away from zero (1.350,00 of 10.000,00 is 14%)', async () => {
      // Months April to September 2026 (September selected): April has no data.
      app = await renderApp({ today: '2026-10-12', transactions: rows(BASE) });
      await app.selectMonth({ year: 2026, month: 9 });
      await openInsights();
      // May to September: income 10.000,00, expenses 8.650,00, saved 1.350,00 = 13.5%.
      expect(trendMonths()).toEqual(['April', 'May', 'June', 'July', 'August', 'September']);
      expect(screen.getByText(t('Saved 1.350,00 € in 5 months · 14%'))).toBeTruthy();
    });

    it('FR-012: the headline minus sign and a negative overall rate come from the totals', async () => {
      await openOctober(
        rows([
          ['2026-09', 100_000, 130_000],
          ['2026-10', 100_000, 120_000],
        ]),
      );
      // Saved -300,00 + -200,00 = -500,00 of 2.000,00 income = -25%.
      expect(screen.getByText(t('Saved -500,00 € in 2 months · -25%'))).toBeTruthy();
      expect(screen.getByLabelText(t('Saved minus 500,00 € in 2 months, minus 25 percent'))).toBeTruthy();
    });

    it('FR-011: the trend counts a transaction dated after today in the current month, like the 001 totals', async () => {
      await openOctober([income('2026-10-02', 100_000), expense('2026-10-25', 30_000)]);
      expect(screen.getByText(t('Saved 700,00 € in 1 month · 70%'))).toBeTruthy();
    });

    it('FR-013: the selected month offers no "View month"', async () => {
      await openOctober(rows(BASE));
      tapMonth('October');
      expect(screen.getByText(t('Income: 2.000,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Expenses: 1.550,00 €'))).toBeTruthy();
      expect(screen.getByText(t('Saved: 450,00 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: 23%')).toBeTruthy(); // 22.5% rounds half away from zero
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
    });

    it('FR-013: a savings rate that rounds to zero shows "<1%" with its sign', async () => {
      await openOctober(
        rows([
          ['2026-08', 1_000_000, 999_950], // +0,50 saved: 0.005% -> <1%
          ['2026-09', 1_000_000, 1_000_050], // -0,50 saved: -0.005% -> -<1%
        ]),
      );
      tapMonth('August');
      expect(screen.getByText(t('Saved: 0,50 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: <1%')).toBeTruthy();
      tapMonth('September');
      expect(screen.getByText(t('Saved: -0,50 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: -<1%')).toBeTruthy();
    });

    it('FR-013: a month with equal income and expenses shows "Saved: 0,00 €" and "Savings rate: 0%"', async () => {
      await openOctober(rows([['2026-09', 100_000, 100_000]]));
      tapMonth('September');
      expect(screen.getByText(t('Saved: 0,00 €'))).toBeTruthy();
      expect(screen.getByText('Savings rate: 0%')).toBeTruthy();
    });

    it('FR-014: the selected month button has the selected state, the others do not', async () => {
      await openOctober(rows(BASE));
      expect(screen.queryByRole('button', { name: 'September', selected: true })).toBeNull();
      tapMonth('September');
      expect(screen.getByRole('button', { name: 'September', selected: true })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'August', selected: true })).toBeNull();
      tapMonth('September');
      expect(screen.queryByRole('button', { name: 'September', selected: true })).toBeNull();
    });

    it('FR-018: adding, editing and deleting a transaction updates the headline', async () => {
      await openOctober(rows(BASE));
      expect(screen.getByText(t('Saved 1.800,00 € in 6 months · 15%'))).toBeTruthy();

      // Expenses 10.300,00: saved 1.700,00 = 14.2% -> 14%.
      const id = await app.add(expense('2026-10-08', 10_000));
      expect(screen.getByText(t('Saved 1.700,00 € in 6 months · 14%'))).toBeTruthy();

      // Moved to July: the total is the same, so the headline does not change...
      await app.update(id, expense('2026-07-08', 10_000));
      expect(screen.getByText(t('Saved 1.700,00 € in 6 months · 14%'))).toBeTruthy();
      // ...but July itself now has expenses 1.600,00.
      tapMonth('July');
      expect(screen.getByText(t('Expenses: 1.600,00 €'))).toBeTruthy();
      tapMonth('July'); // hide

      // Moved out of the range (April): it no longer counts anywhere.
      await app.update(id, expense('2026-04-08', 10_000));
      expect(screen.getByText(t('Saved 1.800,00 € in 6 months · 15%'))).toBeTruthy();

      await app.update(id, { ...expense('2026-10-08', 10_000), type: 'income', category: 'gifts' });
      // Income 12.100,00, expenses 10.200,00: saved 1.900,00 = 15.7% -> 16%.
      expect(screen.getByText(t('Saved 1.900,00 € in 6 months · 16%'))).toBeTruthy();

      await app.remove(id);
      expect(screen.getByText(t('Saved 1.800,00 € in 6 months · 15%'))).toBeTruthy();
    });

    it('FR-023: each month is a button whose accessible value gives income, expenses, saved and rate', async () => {
      await openOctober(rows(BASE));
      const value = (name: string) => monthButton(name).props.accessibilityValue?.text as string;
      expect(value('September')).toMatch(
        t('Income 2.000,00 €, expenses 1.700,00 €, saved 300,00 €, savings rate 15 percent'),
      );
      expect(value('August')).toMatch(
        t('Income 2.000,00 €, expenses 2.150,00 €, saved minus 150,00 €, savings rate minus 8 percent'),
      );
    });

    it('FR-023: the accessible value says "savings rate no income" for a month without income, and "No data" for an empty one', async () => {
      await openOctober(rows([['2026-07', 0, 40_000], ['2026-10', 200_000, 100_000]]));
      const value = (name: string) => monthButton(name).props.accessibilityValue?.text as string;
      expect(value('July')).toMatch(
        t('Income 0,00 €, expenses 400,00 €, saved minus 400,00 €, savings rate no income'),
      );
      expect(value('June')).toBe('No data');
    });

    it('FR-015: the trend offers no way to add, edit or delete a transaction', async () => {
      await openOctober(rows(BASE));
      tapMonth('September');
      expect(screen.queryByRole('button', { name: /^(Add|Edit|Delete)/i })).toBeNull();
    });

    it('FR-020: when stored data cannot be read the trend is not shown as empty, and Try again brings it back', async () => {
      await openOctober(rows(BASE));
      app.failReads(true);
      await app.selectMonth({ year: 2026, month: 9 });
      expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
      expect(screen.queryByText('No data yet')).toBeNull();
      expect(screen.queryByText(/^Saved .* in \d+ months?/)).toBeNull();

      app.failReads(false);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      await app.settle();
      expect(screen.getByText(t('Saved 1.350,00 € in 5 months · 14%'))).toBeTruthy();
    });
  });

  describe('View month and month selection (FR-029 to FR-031)', () => {
    it('FR-030: "View month" makes September the selected month in every section with no detail open', async () => {
      await openOctober(rows(BASE));
      tapMonth('September');
      fireEvent.press(screen.getByRole('button', { name: 'View month' }));
      await app.settle();

      expect(app.screen).toBe('insights');
      // The month control (button) is US4's (T044); here the month shows as the header's text.
      expect(screen.getByText('September 2026')).toBeTruthy();
      // Pace section: September spent 1.700,00 against August's 2.150,00.
      expect(screen.getByText(t('450,00 € less than August'))).toBeTruthy();
      // Trend section: April to September, no detail open.
      expect(trendMonths()).toEqual(['April', 'May', 'June', 'July', 'August', 'September']);
      expect(screen.getByText(t('Saved 1.350,00 € in 5 months · 14%'))).toBeTruthy();
      expect(detailOpen()).toBe(false);
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
    });

    it('FR-029: Back after "View month" returns to the summary showing the chosen month', async () => {
      await openOctober(rows(BASE));
      tapMonth('August');
      fireEvent.press(screen.getByRole('button', { name: 'View month' }));
      await app.settle();
      expect(screen.getByText(t('650,00 € more than July'))).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      await app.settle();
      expect(app.screen).toBe('summary');
      // The month control (button) is US4's (T044); here the month shows as the header's text.
      expect(screen.getByText('August 2026')).toBeTruthy();
    });

    it('FR-030: "View month" works for a month with no data, and the trend then ends with it', async () => {
      await openOctober(rows([['2026-09', 100_000, 90_000], ['2026-10', 200_000, 180_000]]));
      tapMonth('July');
      fireEvent.press(screen.getByRole('button', { name: 'View month' }));
      await app.settle();
      // The month control (button) is US4's (T044); here the month shows as the header's text.
      expect(screen.getByText('July 2026')).toBeTruthy();
      // February to July have no data: "No data yet" and no chart (contract, Section 3).
      expect(screen.getByText('No data yet')).toBeTruthy();
      expect(trendMonths()).toEqual([]);
      expect(detailOpen()).toBe(false);
    });

    it('FR-031: changing the month while Insights is open hides an open trend detail', async () => {
      await openOctober(rows(BASE));
      tapMonth('September');
      expect(detailOpen()).toBe(true);
      await app.selectMonth({ year: 2026, month: 8 });
      expect(detailOpen()).toBe(false);
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
      expect(trendMonths()).toEqual(['March', 'April', 'May', 'June', 'July', 'August']);
      expect(screen.queryByRole('button', { name: 'August', selected: true })).toBeNull();
    });

    it('FR-011: the trend does not depend on today (a past month uses all its stored transactions)', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: rows([['2026-08', 200_000, 215_000]]),
      });
      await app.selectMonth({ year: 2026, month: 8 });
      await openInsights();
      expect(screen.getByText(t('Saved -150,00 € in 1 month · -8%'))).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('Edge: the range never goes before January 2000 even when the selected month is early in 2000', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: rows([['2000-03', 100_000, 50_000]]),
      });
      await app.selectMonth({ year: 2000, month: 3 });
      await openInsights();
      expect(trendMonths()).toEqual(['January', 'February', 'March']);
      expect(screen.queryByText('No data')).toBeNull();
      expect(accessibleValue('January')).toBe('No data');
      expect(accessibleValue('February')).toBe('No data');
      expect(screen.getByText(t('Saved 500,00 € in 1 month · 50%'))).toBeTruthy();
    });

    it('Edge: the date changing while the app is open moves the six-month range to the new month', async () => {
      await openOctober(rows(BASE));
      expect(trendMonths()[0]).toBe('May');
      await app.setToday('2026-11-01');
      // The selected month was the current one, so it moves to November: June to November.
      expect(trendMonths()).toEqual(['June', 'July', 'August', 'September', 'October', 'November']);
      expect(screen.queryByText('No data')).toBeNull();
      expect(accessibleValue('November')).toBe('No data'); // November has no data yet
    });
  });
});
