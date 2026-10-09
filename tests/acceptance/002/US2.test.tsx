// Acceptance tests for 002 User Story 2: the "Categories vs last month" section on Insights.
// Black box: only specs/002-monthly-charts/spec.md and contracts/ were read.
// Region is es-ES (the harness default), so amounts read like `260,00 €`.
import { fireEvent, screen, within } from '@testing-library/react-native';

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

/** Opens Insights for a past month (August 2026), compared as whole months against July. */
async function openAugust(transactions: TransactionInput[]) {
  app = await renderApp({ today: '2026-10-12', transactions });
  await app.selectMonth({ year: 2026, month: 8 });
  await openInsights();
}

/** Opens Insights for the current month (October 2026, today the 12th). */
async function openOctober(transactions: TransactionInput[]) {
  app = await renderApp({ today: '2026-10-12', transactions });
  await openInsights();
}

/** The accessible row of a category, found by its full accessibility label. */
const row = (label: string) => screen.getByLabelText(t(label));

/** The compact list has no column titles (developer, 2026-10-09). */
const expectNoColumnTitles = () => {
  expect(screen.queryByText('This month')).toBeNull();
  expect(screen.queryByText('Last month')).toBeNull();
  expect(screen.queryByText('Change')).toBeNull();
};

/** Category names in the order the rows appear on screen. */
const rowOrder = (period: 'August' | 'this month') =>
  screen
    .queryAllByLabelText(new RegExp(`^[A-Za-z ]+, ${period} \\d`))
    .map((el) => String(el.props.accessibilityLabel).split(',')[0]);

describe('US2: categories vs last month', () => {
  describe('acceptance scenarios (past month, whole months)', () => {
    it('US2-AS1: Food 200.00 -> 260.00 shows 260,00 €, "+60,00 € vs July" and +30%, not last month amount', async () => {
      await openAugust([
        expense('2026-07-05', 20_000),
        expense('2026-08-02', 10_000),
        expense('2026-08-31', 16_000), // late in the month: a whole-month comparison counts it
      ]);
      const food = within(row('Food, August 260,00 €, July 200,00 €, plus 60,00 €, plus 30 percent'));
      expect(food.getByText('Food')).toBeTruthy();
      expect(food.getByText(t('260,00 €'))).toBeTruthy();
      expect(food.queryByText(t('200,00 €'))).toBeNull(); // only in the accessibility label
      expect(food.getByText(t('+60,00 € vs July'))).toBeTruthy();
      expect(food.getByText(t('+30%'))).toBeTruthy();
      expectNoColumnTitles();
    });

    it('US2-AS2: Transport 80.00 -> 50.00 shows "-30,00 € vs July" and -38% (-37.5% rounds away from zero)', async () => {
      await openAugust([expense('2026-07-05', 8_000, 'transport'), expense('2026-08-05', 5_000, 'transport')]);
      const transport = within(
        row('Transport, August 50,00 €, July 80,00 €, minus 30,00 €, minus 38 percent'),
      );
      expect(transport.getByText(t('-30,00 € vs July'))).toBeTruthy();
      expect(transport.getByText(t('-38%'))).toBeTruthy();
    });

    it('US2-AS3: Leisure with no expenses last month shows "+40,00 € vs July" and "New" instead of a percent', async () => {
      await openAugust([expense('2026-07-05', 1_000), expense('2026-08-09', 4_000, 'leisure')]);
      const leisure = within(row('Leisure, August 40,00 €, July 0,00 €, plus 40,00 €, new'));
      expect(leisure.getByText(t('40,00 €'))).toBeTruthy();
      expect(leisure.queryByText(t('0,00 €'))).toBeNull(); // last month amount is not visible text
      expect(leisure.getByText(t('+40,00 € vs July'))).toBeTruthy();
      expect(leisure.getByText('New')).toBeTruthy();
      expect(leisure.queryByText(/%/)).toBeNull();
    });

    it('US2-AS4: Health 25.00 last month and nothing this month shows 0,00 €, "-25,00 € vs July" and -100%', async () => {
      await openAugust([expense('2026-07-05', 2_500, 'health'), expense('2026-08-05', 1_000)]);
      const health = within(row('Health, August 0,00 €, July 25,00 €, minus 25,00 €, minus 100 percent'));
      expect(health.getByText(t('0,00 €'))).toBeTruthy();
      expect(health.queryByText(t('25,00 €'))).toBeNull();
      expect(health.getByText(t('-25,00 € vs July'))).toBeTruthy();
      expect(health.getByText(t('-100%'))).toBeTruthy();
    });

    it('US2-AS5: rows are ordered +60.00, +40.00, 0.00, -30.00; equal changes alphabetically', async () => {
      await openAugust([
        // Food +60,00
        expense('2026-07-05', 20_000, 'food'),
        expense('2026-08-05', 26_000, 'food'),
        // Housing and Leisure both +40,00: Housing first
        expense('2026-07-06', 10_000, 'housing'),
        expense('2026-08-06', 14_000, 'housing'),
        expense('2026-07-07', 1_000, 'leisure'),
        expense('2026-08-07', 5_000, 'leisure'),
        // Bills and Health both 0,00: Bills first
        expense('2026-07-08', 10_000, 'bills'),
        expense('2026-08-08', 10_000, 'bills'),
        expense('2026-07-09', 5_000, 'health'),
        expense('2026-08-09', 5_000, 'health'),
        // Transport -30,00
        expense('2026-07-10', 8_000, 'transport'),
        expense('2026-08-10', 5_000, 'transport'),
      ]);
      expect(rowOrder('August')).toEqual(['Food', 'Housing', 'Leisure', 'Bills', 'Health', 'Transport']);
      // A zero change has no sign.
      const bills = within(row('Bills, August 100,00 €, July 100,00 €, 0,00 €, 0 percent'));
      expect(bills.getByText(t('100,00 €'))).toBeTruthy();
      expect(bills.getByText(t('0,00 € vs July'))).toBeTruthy();
      expect(bills.getByText(t('0%'))).toBeTruthy();
    });

    it('US2-AS6: a category with no expenses in either month is not listed (income is not an expense)', async () => {
      await openAugust([
        expense('2026-07-05', 2_000, 'food'),
        expense('2026-08-05', 3_000, 'food'),
        income('2026-07-01', 100_000, 'salary'),
        income('2026-08-01', 100_000, 'salary'),
        expense('2026-06-05', 9_000, 'transport'), // two months back: not in either month
      ]);
      expect(rowOrder('August')).toEqual(['Food']);
      expect(screen.queryByText('Transport')).toBeNull();
      expect(screen.queryByText('Salary')).toBeNull();
    });

    it('US2-AS7: previous month without data (current month) lists this month amounts only, with the no-data sentence', async () => {
      await openOctober([
        expense('2026-10-02', 10_000, 'food'),
        expense('2026-10-05', 4_000, 'transport'),
        expense('2026-10-06', 4_000, 'bills'),
        expense('2026-08-10', 7_000), // two months back: September still has no data
      ]);
      // Once in the pace section and once in the categories section.
      expect(screen.getAllByText(t('No data from last month to compare'))).toHaveLength(2);
      // Largest first, equal amounts alphabetically.
      expect(rowOrder('this month')).toEqual(['Food', 'Bills', 'Transport']);
      const food = within(row('Food, this month 100,00 €'));
      expect(food.getByText(t('100,00 €'))).toBeTruthy();
      // Label and amount only: no change line, no percent, no titles, no "Compared by" label.
      expect(food.getByText('Food')).toBeTruthy();
      expect(food.queryByText(/ vs /)).toBeNull();
      expect(food.queryByText(/%/)).toBeNull();
      expectNoColumnTitles();
      expect(screen.queryByText(/^Compared by day/)).toBeNull();
      expect(screen.queryByText(/^[+\-−]\d/)).toBeNull();
      expect(screen.queryByText('New')).toBeNull();
    });

    it('US2-AS7: past month without previous data names that month in the sentence, with amounts only', async () => {
      await openAugust([expense('2026-08-02', 26_000, 'food'), expense('2026-08-03', 4_000, 'leisure')]);
      expect(screen.getAllByText(t('No data from July to compare'))).toHaveLength(2);
      expect(rowOrder('August')).toEqual(['Food', 'Leisure']);
      const food = within(row('Food, August 260,00 €'));
      expect(food.getByText(t('260,00 €'))).toBeTruthy();
      expect(food.queryByText(/ vs /)).toBeNull();
      expect(food.queryByText(/%/)).toBeNull();
      expectNoColumnTitles();
      expect(screen.queryByText(/^Compared by day/)).toBeNull();
    });

    it('US2-AS8: neither month has expenses shows no rows and "No spending to compare yet"', async () => {
      // Both months have data (income) but no expenses; this rule wins over "no data".
      await openAugust([income('2026-07-01', 100_000), income('2026-08-01', 100_000)]);
      // Once in the pace section and once in the categories section.
      expect(screen.getAllByText(t('No spending to compare yet'))).toHaveLength(2);
      expect(screen.queryAllByLabelText(/, August \d/)).toHaveLength(0);
      expectNoColumnTitles();
    });

    it('US2-AS8: also when the previous month has no data at all', async () => {
      await openAugust([income('2026-08-01', 100_000)]);
      expect(screen.getAllByText(t('No spending to compare yet'))).toHaveLength(2);
      expect(screen.queryByText(/^No data from/)).toBeNull();
      expect(screen.queryAllByLabelText(/, August \d/)).toHaveLength(0);
    });

    it('US2-AS9: current month is compared by day 12: 100,00 € against 90,00 € shows "+10,00 € vs last month", +11% and "Compared by day 12"', async () => {
      await openOctober([
        expense('2026-10-03', 6_000, 'food'),
        expense('2026-10-12', 4_000, 'food'), // October by day 12: 100.00
        expense('2026-10-15', 5_000, 'food'), // dated after today: left out
        expense('2026-09-04', 9_000, 'food'), // September by day 12: 90.00
        expense('2026-09-20', 17_000, 'food'), // September in all: 260.00
      ]);
      expect(screen.getByText('Compared by day 12')).toBeTruthy();
      expectNoColumnTitles();
      const food = within(
        row('Food, this month 100,00 €, last month 90,00 €, plus 10,00 €, plus 11 percent'),
      );
      expect(food.getByText('Food')).toBeTruthy();
      expect(food.getByText(t('100,00 €'))).toBeTruthy();
      expect(food.queryByText(t('90,00 €'))).toBeNull(); // only in the accessibility label
      expect(food.getByText(t('+10,00 € vs last month'))).toBeTruthy();
      expect(food.getByText(t('+11%'))).toBeTruthy();
    });
  });

  describe('functional requirements', () => {
    it('FR-008: a category spent only after the comparison day last month is not listed this month', async () => {
      await openOctober([
        expense('2026-10-03', 5_000, 'food'),
        expense('2026-09-03', 4_000, 'food'),
        expense('2026-09-20', 9_000, 'transport'), // after day 12: not counted, so not listed
      ]);
      expect(rowOrder('this month')).toEqual(['Food']);
      expect(screen.queryByText('Transport')).toBeNull();
    });

    it('FR-008: by the comparison day, a category new this month shows "New" and one gone shows -100%', async () => {
      await openOctober([
        expense('2026-10-05', 4_000, 'leisure'),
        expense('2026-09-05', 2_500, 'health'),
        expense('2026-09-06', 1_000, 'food'),
        expense('2026-10-06', 1_000, 'food'),
      ]);
      expect(screen.getByText('Compared by day 12')).toBeTruthy();
      expect(
        within(row('Leisure, this month 40,00 €, last month 0,00 €, plus 40,00 €, new')).getByText('New'),
      ).toBeTruthy();
      const health = within(
        row('Health, this month 0,00 €, last month 25,00 €, minus 25,00 €, minus 100 percent'),
      );
      expect(health.getByText(t('-100%'))).toBeTruthy();
      expect(health.getByText(t('-25,00 € vs last month'))).toBeTruthy();
      expect(rowOrder('this month')).toEqual(['Leisure', 'Food', 'Health']);
    });

    it('FR-008: no expenses by the comparison day in either month reads "No spending to compare yet" without the label', async () => {
      // October has none by day 12; September's expenses are all after day 12.
      await openOctober([expense('2026-09-20', 8_000, 'food'), expense('2026-09-28', 1_000, 'bills')]);
      expect(screen.getAllByText(t('No spending to compare yet'))).toHaveLength(2);
      expect(screen.queryByText(/^Compared by day/)).toBeNull();
      expect(screen.queryAllByLabelText(/, this month \d/)).toHaveLength(0);
    });

    it('FR-009: rows are ordered by the euro change, not by the percent', async () => {
      await openAugust([
        // Bills: +10,00 (+100%); Housing: +50,00 (+5%): Housing first even with the smaller percent.
        expense('2026-07-05', 1_000, 'bills'),
        expense('2026-08-05', 2_000, 'bills'),
        expense('2026-07-06', 100_000, 'housing'),
        expense('2026-08-06', 105_000, 'housing'),
      ]);
      expect(rowOrder('August')).toEqual(['Housing', 'Bills']);
    });

    it('FR-010: current month tie in amounts without previous data is ordered alphabetically', async () => {
      await openOctober([
        expense('2026-10-01', 3_000, 'transport'),
        expense('2026-10-02', 3_000, 'health'),
        expense('2026-10-03', 9_000, 'shopping'),
      ]);
      expect(rowOrder('this month')).toEqual(['Shopping', 'Health', 'Transport']);
    });

    it('FR-017: a change that rounds to zero shows "+<1%" or "-<1%" with its sign', async () => {
      await openAugust([
        expense('2026-07-05', 100_000, 'food'),
        expense('2026-08-05', 100_050, 'food'), // +0,50 € = +0.05%
        expense('2026-07-06', 100_050, 'bills'),
        expense('2026-08-06', 100_000, 'bills'), // -0,50 € = -0.05%
      ]);
      const food = within(
        row('Food, August 1.000,50 €, July 1.000,00 €, plus 0,50 €, plus less than 1 percent'),
      );
      expect(food.getByText(t('+<1%'))).toBeTruthy();
      expect(food.getByText(t('+0,50 € vs July'))).toBeTruthy();
      const bills = within(
        row('Bills, August 1.000,00 €, July 1.000,50 €, minus 0,50 €, minus less than 1 percent'),
      );
      expect(bills.getByText(t('-<1%'))).toBeTruthy();
      expect(bills.getByText(t('-0,50 € vs July'))).toBeTruthy();
    });

    it('FR-017: percents round half away from zero (12.5% shows +13%) and thousands use the region format', async () => {
      await openAugust([
        expense('2026-07-05', 80_000, 'housing'),
        expense('2026-08-05', 90_000, 'housing'), // +12.5%
        expense('2026-07-06', 123_456, 'shopping'),
        expense('2026-08-06', 100_000, 'shopping'), // -19.0%
      ]);
      expect(
        within(row('Housing, August 900,00 €, July 800,00 €, plus 100,00 €, plus 13 percent')).getByText(
          t('+13%'),
        ),
      ).toBeTruthy();
      const shopping = within(
        row('Shopping, August 1.000,00 €, July 1.234,56 €, minus 234,56 €, minus 19 percent'),
      );
      expect(shopping.getByText(t('1.000,00 €'))).toBeTruthy();
      expect(shopping.getByText(t('-234,56 € vs July'))).toBeTruthy();
      expect(shopping.getByText(t('-19%'))).toBeTruthy();
    });

    it('FR-018: adding, editing and deleting a transaction updates the rows', async () => {
      await openAugust([expense('2026-07-05', 20_000), expense('2026-08-05', 26_000)]);
      expect(rowOrder('August')).toEqual(['Food']);

      const id = await app.add(expense('2026-08-10', 4_000, 'leisure'));
      expect(rowOrder('August')).toEqual(['Food', 'Leisure']); // +60,00 then +40,00
      expect(row('Leisure, August 40,00 €, July 0,00 €, plus 40,00 €, new')).toBeTruthy();

      // Moving it to July turns it into a decrease (-40,00 €) and reorders the rows.
      await app.update(id, expense('2026-07-10', 4_000, 'leisure'));
      expect(rowOrder('August')).toEqual(['Food', 'Leisure']);
      expect(
        row('Leisure, August 0,00 €, July 40,00 €, minus 40,00 €, minus 100 percent'),
      ).toBeTruthy();

      // Turning it into income removes the row.
      await app.update(id, { ...expense('2026-07-10', 4_000, 'leisure'), type: 'income', category: 'gifts' });
      expect(rowOrder('August')).toEqual(['Food']);

      const id2 = await app.add(expense('2026-08-11', 1_000, 'bills'));
      expect(rowOrder('August')).toEqual(['Food', 'Bills']);
      await app.remove(id2);
      expect(rowOrder('August')).toEqual(['Food']);
    });

    it('FR-018: in the current month a new expense dated after today stays out of the comparison', async () => {
      await openOctober([expense('2026-10-05', 5_000, 'food'), expense('2026-09-05', 4_000, 'food')]);
      await app.add(expense('2026-10-20', 9_000, 'transport'));
      expect(rowOrder('this month')).toEqual(['Food']);
      expect(screen.queryByText('Transport')).toBeNull();
      await app.add(expense('2026-10-12', 2_000, 'transport'));
      // Transport +20,00 now outranks Food +10,00.
      expect(rowOrder('this month')).toEqual(['Transport', 'Food']);
    });

    it('FR-023: each row is a single accessible element and rows are not tappable', async () => {
      await openAugust([expense('2026-07-05', 20_000), expense('2026-08-05', 26_000)]);
      const food = row('Food, August 260,00 €, July 200,00 €, plus 60,00 €, plus 30 percent');
      expect(food.props.accessible).toBe(true);
      expect(screen.queryByRole('button', { name: /^Food, / })).toBeNull();
    });

    it('FR-015: the section offers no way to add, edit or delete a transaction', async () => {
      await openAugust([expense('2026-07-05', 20_000), expense('2026-08-05', 26_000)]);
      expect(screen.queryByRole('button', { name: /^(Add|Edit|Delete)/i })).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('Edge: January 2000 has no previous data, so the categories show amounts only', async () => {
      app = await renderApp({ today: '2000-01-15', transactions: [expense('2000-01-05', 4_000)] });
      await openInsights();
      expect(screen.getAllByText(t('No data from last month to compare'))).toHaveLength(2);
      expect(rowOrder('this month')).toEqual(['Food']);
    });

    it('Edge: comparison day past the previous month end compares with all of February', async () => {
      // 2024-03-30; February has 29 days. March by day 30: Food 100,00 (the 31st is left out).
      app = await renderApp({
        today: '2024-03-30',
        transactions: [
          expense('2024-02-29', 6_000, 'food'),
          expense('2024-02-10', 4_000, 'food'), // February in all: Food 100,00
          expense('2024-03-30', 13_000, 'food'),
          expense('2024-03-31', 7_000, 'food'), // after today: left out
        ],
      });
      await openInsights();
      expect(screen.getByText('Compared by day 30')).toBeTruthy();
      expect(
        row('Food, this month 130,00 €, last month 100,00 €, plus 30,00 €, plus 30 percent'),
      ).toBeTruthy();
    });

    it('Edge: a past month is always whole, whatever the transactions dates are', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-09-25', 9_000), expense('2026-08-05', 4_000)],
      });
      // September is a past month here: whole September against whole August, no "Compared by" label.
      await app.selectMonth({ year: 2026, month: 9 });
      await openInsights();
      expect(screen.queryByText(/^Compared by day/)).toBeNull();
      expect(
        within(
          row('Food, September 90,00 €, August 40,00 €, plus 50,00 €, plus 125 percent'),
        ).getByText(t('+50,00 € vs August')),
      ).toBeTruthy();
    });

    it('Edge: the date changing while the app is open moves the comparison day', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-13', 2_000), expense('2026-09-05', 3_000)],
      });
      await openInsights();
      expect(screen.getByText('Compared by day 12')).toBeTruthy();
      expect(rowOrder('this month')).toEqual(['Food']);
      expect(row('Food, this month 0,00 €, last month 30,00 €, minus 30,00 €, minus 100 percent')).toBeTruthy();
      await app.setToday('2026-10-13');
      expect(screen.getByText('Compared by day 13')).toBeTruthy();
      expect(row('Food, this month 20,00 €, last month 30,00 €, minus 10,00 €, minus 33 percent')).toBeTruthy();
    });

    it('SC-001: a mixed reference month matches a hand calculation row by row', async () => {
      // August against July, whole months. Hand-calculated changes:
      // Housing  620,00 vs 600,00 = +20,00  (+3%)
      // Food     212,45 vs 187,30 = +25,15  (+13%)  -> 13.4% rounds to 13
      // Leisure   59,98 vs   0,00 = +59,98  (New)
      // Bills    110,00 vs 110,00 =   0,00  (0%)
      // Transport 18,50 vs  64,20 = -45,70  (-71%)  -> 71.18% rounds to 71
      await openAugust([
        expense('2026-07-01', 60_000, 'housing'),
        expense('2026-08-01', 62_000, 'housing'),
        expense('2026-07-04', 11_230, 'food'),
        expense('2026-07-20', 7_500, 'food'),
        expense('2026-08-03', 12_445, 'food'),
        expense('2026-08-31', 8_800, 'food'),
        expense('2026-08-09', 5_998, 'leisure'),
        expense('2026-07-15', 11_000, 'bills'),
        expense('2026-08-15', 11_000, 'bills'),
        expense('2026-07-12', 6_420, 'transport'),
        expense('2026-08-12', 1_850, 'transport'),
        income('2026-07-01', 200_000),
        income('2026-08-01', 200_000),
      ]);
      expect(rowOrder('August')).toEqual(['Leisure', 'Food', 'Housing', 'Bills', 'Transport']);
      expect(row('Housing, August 620,00 €, July 600,00 €, plus 20,00 €, plus 3 percent')).toBeTruthy();
      expect(row('Food, August 212,45 €, July 187,30 €, plus 25,15 €, plus 13 percent')).toBeTruthy();
      expect(row('Leisure, August 59,98 €, July 0,00 €, plus 59,98 €, new')).toBeTruthy();
      expect(row('Bills, August 110,00 €, July 110,00 €, 0,00 €, 0 percent')).toBeTruthy();
      expect(row('Transport, August 18,50 €, July 64,20 €, minus 45,70 €, minus 71 percent')).toBeTruthy();
    });
  });
});
