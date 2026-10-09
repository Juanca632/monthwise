// Acceptance tests for 002 User Story 1: the Spending pace card on the summary and the pace chart
// on the Insights screen. Black box: only specs/002-monthly-charts/spec.md and contracts/ were read.
// Region is es-ES (the harness default), so amounts read like `85,00 €`.
import { fireEvent, screen } from '@testing-library/react-native';

// The harness installs its mocks on import: keep it before any '@/...' module.
import { renderApp, type AppHandle } from '../../helpers/app';
import type { TransactionInput } from '@/domain/validation';

const expense = (date: string, amountCents: number, category = 'food'): TransactionInput =>
  ({ type: 'expense', amountCents, date, category, note: null }) as TransactionInput;
const income = (date: string, amountCents: number, category = 'salary'): TransactionInput =>
  ({ type: 'income', amountCents, date, category, note: null }) as TransactionInput;

/**
 * Exact-text matcher that tolerates what the spec leaves to the phone's region: the kind of space
 * before the euro sign, an optional thousands dot, and a minus written as "-" or U+2212.
 */
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
const normalize = (s: string) => s.replace(/[  ]/g, ' ').replace(/−/g, '-');

/** Centre of day N on the chart: day N covers (N-1)·w/31 to N·w/31. */
let app: AppHandle;
const dayX = (n: number) => ((n - 0.5) * app.paceChart.width) / 31;

const card = (sentence: string) => screen.getByRole('button', { name: t(`Spending pace, ${sentence}`) });
const anyCard = () => screen.getByRole('button', { name: /^Spending pace, / });

async function openInsights() {
  fireEvent.press(anyCard());
  await app.settle();
}

describe('US1: spending pace', () => {
  describe('summary card', () => {
    it('US1-AS1: 300.00 against 215.00 by day 12 reads "85,00 € more than last month by day 12"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [
          expense('2026-10-05', 30_000),
          expense('2026-09-05', 21_500),
          expense('2026-09-20', 5_000), // after day 12: must not count
        ],
      });
      expect(card('85,00 € more than last month by day 12')).toBeTruthy();
    });

    it('US1-AS2: 150.00 against 215.00 by day 12 reads "65,00 € less than last month by day 12"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 15_000), expense('2026-09-05', 21_500)],
      });
      expect(card('65,00 € less than last month by day 12')).toBeTruthy();
    });

    it('US1-AS3: equal spending by the comparison day reads "Same as last month by day 12"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 20_000), expense('2026-09-12', 20_000)],
      });
      expect(card('Same as last month by day 12')).toBeTruthy();
    });

    it('US1-AS4: past month August 1,200.00 against July 1,000.00 reads "200,00 € more than July", whole months', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [
          expense('2026-08-02', 70_000),
          expense('2026-08-31', 50_000), // late in the month: only a whole-month comparison sees it
          expense('2026-07-10', 60_000),
          expense('2026-07-31', 40_000),
        ],
      });
      await app.selectMonth({ year: 2026, month: 8 });
      expect(card('200,00 € more than July')).toBeTruthy();
    });

    it('US1-AS5: the current month line ends at today, the previous month covers its whole month (seen on Insights)', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [
          expense('2026-10-05', 10_000),
          expense('2026-09-02', 5_000),
          expense('2026-09-25', 20_000),
        ],
      });
      await openInsights();
      await app.paceChart.tapAt(dayX(12));
      expect(screen.getByText(t('October: 100,00 €'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(13));
      expect(screen.getByText(t('Day 13'))).toBeTruthy();
      expect(screen.queryByText(/^October:/)).toBeNull();
      expect(screen.getByText(t('September: 50,00 €'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(30));
      expect(screen.getByText(t('September: 250,00 €'))).toBeTruthy();
    });

    it('US1-AS6: previous month without data: current month and past month sentences', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-08-10', 7_000)],
      });
      expect(card('No data from last month to compare')).toBeTruthy();
      await app.selectMonth({ year: 2026, month: 8 });
      expect(card('No data from July to compare')).toBeTruthy();
    });

    it('US1-AS7: no expenses in either month reads "No spending to compare yet", also by the comparison day', async () => {
      // Previous month has data (income only) but no expenses.
      app = await renderApp({
        today: '2026-10-12',
        transactions: [income('2026-09-01', 200_000), income('2026-10-01', 200_000)],
      });
      expect(card('No spending to compare yet')).toBeTruthy();
      app.unmount();

      // September's expenses all fall after day 12 and October has none by day 12.
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-09-20', 8_000), expense('2026-09-28', 1_000)],
      });
      expect(card('No spending to compare yet')).toBeTruthy();
    });

    it('US1-AS8: tapping the card opens Insights for that same month', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      expect(app.screen).toBe('insights');
      expect(screen.getByText('October 2026')).toBeTruthy();
      await app.back();
      expect(app.screen).toBe('summary');

      await app.selectMonth({ year: 2026, month: 8 });
      await openInsights();
      expect(app.screen).toBe('insights');
      expect(screen.getByText('August 2026')).toBeTruthy();
      await app.back();
      expect(app.screen).toBe('summary');
      expect(screen.getByText('August 2026')).toBeTruthy();
    });
  });

  describe('Insights pace chart', () => {
    const seed9 = [
      expense('2026-10-03', 7_000),
      expense('2026-10-08', 5_000), // October by day 8: 120.00
      expense('2026-09-02', 6_000),
      expense('2026-09-08', 4_000), // September by day 8: 100.00
    ];

    it('US1-AS9: tapping Day 8 shows both amounts and the difference without leaving the screen', async () => {
      app = await renderApp({ today: '2026-10-12', transactions: seed9 });
      await openInsights();
      await app.paceChart.tapAt(dayX(8));
      expect(app.screen).toBe('insights');
      expect(screen.getByText(t('Day 8'))).toBeTruthy();
      expect(screen.getByText(t('October: 120,00 €'))).toBeTruthy();
      expect(screen.getByText(t('September: 100,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+20,00 € · +20%'))).toBeTruthy();
    });

    it('US1-AS10: Day 20 after today shows only the previous month', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-03', 12_000), expense('2026-09-02', 20_000), expense('2026-09-20', 25_000)],
      });
      await openInsights();
      await app.paceChart.tapAt(dayX(20));
      expect(screen.getByText(t('Day 20'))).toBeTruthy();
      expect(screen.getByText(t('September: 450,00 €'))).toBeTruthy();
      expect(screen.queryByText(/^October:/)).toBeNull();
      expect(screen.queryByText(/·/)).toBeNull();
    });

    it('US1-AS11: dragging across the chart and lifting nearest day 8 shows the Day 8 detail', async () => {
      app = await renderApp({ today: '2026-10-12', transactions: seed9 });
      await openInsights();
      await app.paceChart.touch([dayX(1), dayX(4), 74]);
      expect(screen.getByText(t('Day 8'))).toBeTruthy();
      expect(screen.getByText(t('October: 120,00 €'))).toBeTruthy();
      expect(screen.getByText(t('September: 100,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+20,00 € · +20%'))).toBeTruthy();
    });

    it('US1-AS12: adds, edits and deletes show up on the card and on the chart', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 30_000), expense('2026-09-05', 21_500)],
      });
      expect(card('85,00 € more than last month by day 12')).toBeTruthy();
      const id = await app.add(expense('2026-10-10', 10_000));
      expect(card('185,00 € more than last month by day 12')).toBeTruthy();
      await app.update(id, expense('2026-09-06', 10_000)); // moves to the previous month
      expect(card('15,00 € less than last month by day 12')).toBeTruthy();
      await app.update(id, { ...expense('2026-09-06', 10_000), type: 'income', category: 'gifts' });
      expect(card('85,00 € more than last month by day 12')).toBeTruthy();
      const id2 = await app.add(expense('2026-10-11', 1_000));
      expect(card('95,00 € more than last month by day 12')).toBeTruthy();
      await app.remove(id2);
      expect(card('85,00 € more than last month by day 12')).toBeTruthy();

      // Same on the Insights screen.
      await openInsights();
      expect(screen.getByText(t('85,00 € more than last month by day 12'))).toBeTruthy();
      await app.add(expense('2026-10-09', 2_000));
      expect(screen.getByText(t('105,00 € more than last month by day 12'))).toBeTruthy();
    });

    it('US1-AS13: no detail on open; another day replaces it; the same day hides it', async () => {
      app = await renderApp({ today: '2026-10-12', transactions: seed9 });
      await openInsights();
      expect(screen.queryByText(/^Day \d+$/)).toBeNull();
      await app.paceChart.tapAt(dayX(8));
      expect(screen.getByText(t('Day 8'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(9));
      expect(screen.getByText(t('Day 9'))).toBeTruthy();
      expect(screen.queryByText(t('Day 8'))).toBeNull();
      await app.paceChart.tapAt(dayX(9));
      expect(screen.queryByText(/^Day \d+$/)).toBeNull();
    });

    it('US1-AS14: with the screen reader on, each day is a "Day N" button with the detail as its value; activating toggles', async () => {
      app = await renderApp({ today: '2026-10-12', transactions: seed9, screenReader: true });
      await openInsights();
      const day8 = () => screen.getByRole('button', { name: 'Day 8' });
      expect(normalize(day8().props.accessibilityValue.text)).toBe(
        'October: 120,00 €, September: 100,00 €, plus 20,00 €, plus 20 percent',
      );
      expect(screen.queryByText(/^October:/)).toBeNull();
      fireEvent.press(day8());
      await app.settle();
      expect(screen.getByText(t('Day 8'))).toBeTruthy();
      expect(screen.getByText(t('October: 120,00 €'))).toBeTruthy();
      expect(day8().props.accessibilityState?.selected).toBe(true);
      fireEvent.press(day8());
      await app.settle();
      expect(screen.queryByText(t('Day 8'))).toBeNull();
      expect(day8().props.accessibilityState?.selected).toBeFalsy();
    });
  });

  describe('functional requirements', () => {
    it('FR-001: the card is shown also for a month with no transactions', async () => {
      app = await renderApp({ today: '2026-10-12' });
      expect(card('No spending to compare yet')).toBeTruthy();
      await app.selectMonth({ year: 2026, month: 3 });
      expect(card('No spending to compare yet')).toBeTruthy();
    });

    it('FR-002: the two lines are named by a legend with their month names', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      expect(screen.getAllByText(t('October'), { includeHiddenElements: true }).length).toBeGreaterThan(0);
      expect(screen.getAllByText(t('September'), { includeHiddenElements: true }).length).toBeGreaterThan(0);
    });

    it('FR-023: the card is one button with its sentence in the label and the hint "Opens Insights"', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 30_000), expense('2026-09-05', 21_500)],
      });
      const button = card('85,00 € more than last month by day 12');
      expect(button.props.accessibilityHint).toBe('Opens Insights');
    });

    it('FR-005: Insights has the three section titles, the month control, and a Back that returns to the summary', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy();
      expect(screen.getByRole('header', { name: 'Spending pace' })).toBeTruthy();
      expect(screen.getByRole('header', { name: 'Categories vs last month' })).toBeTruthy();
      expect(screen.getByRole('header', { name: 'Savings trend' })).toBeTruthy();
      // The month control (role, label, hint) is US4's; its checks live in US4's tests (T044).
      expect(screen.getByText('October 2026')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      await app.settle();
      expect(app.screen).toBe('summary');
    });

    it('FR-006: the chart marks day numbers and a drag past the chart edge stays on the last day', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      for (const label of ['1', '8', '15', '22', '29']) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
      await app.paceChart.touch([dayX(20), app.paceChart.width + 200]);
      expect(screen.getByText(t('Day 31'))).toBeTruthy();
      await app.paceChart.touch([dayX(20), -200]);
      expect(screen.getByText(t('Day 1'))).toBeTruthy();
    });

    it('FR-006: a mostly vertical movement scrolls and selects nothing', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      await app.paceChart.dragVertically(dayX(8));
      expect(screen.queryByText(/^Day \d+$/)).toBeNull();
      await app.paceChart.tapAt(dayX(5));
      await app.paceChart.dragVertically(dayX(8));
      expect(screen.getByText(t('Day 5'))).toBeTruthy();
    });

    it('FR-006: with the screen reader off the per-day elements are not rendered', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      expect(screen.queryByRole('button', { name: 'Day 8' })).toBeNull();
      await app.setScreenReader(true);
      expect(screen.getByRole('button', { name: 'Day 8' })).toBeTruthy();
    });

    it('FR-007: without previous-month data only the selected month amount is shown', async () => {
      app = await renderApp({ today: '2026-10-12', transactions: [expense('2026-10-03', 10_000)] });
      await openInsights();
      await app.paceChart.tapAt(dayX(5));
      expect(screen.getByText(t('Day 5'))).toBeTruthy();
      expect(screen.getByText(t('October: 100,00 €'))).toBeTruthy();
      expect(screen.queryByText(/^September:/)).toBeNull();
      expect(screen.queryByText(/·/)).toBeNull();
    });

    it('FR-007: previous amount 0 shows only the signed amount (no percent text) and "0%" when both are 0', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-10', 5_000)],
      });
      await openInsights();
      await app.paceChart.tapAt(dayX(6)); // October 100.00, September 0.00
      expect(screen.getByText(t('September: 0,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+100,00 €'))).toBeTruthy();
      expect(screen.queryByText(/New/i)).toBeNull();
      await app.paceChart.tapAt(dayX(2)); // both 0
      expect(screen.getByText(t('0,00 € · 0%'))).toBeTruthy();
    });

    it('FR-014: a drag never hides the open detail', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-03', 12_000), expense('2026-09-02', 10_000)],
      });
      await openInsights();
      await app.paceChart.tapAt(dayX(8));
      await app.paceChart.touch([dayX(8), dayX(9), dayX(8)]); // drag that lifts on the selected day
      expect(screen.getByText(t('Day 8'))).toBeTruthy();
    });

    it('FR-015: Insights offers no way to add, edit or delete a transaction', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      expect(screen.queryByRole('button', { name: /^(Add|Edit|Delete)/i })).toBeNull();
      expect(screen.queryByText(/^(Add|Edit|Delete)$/i)).toBeNull();
    });

    it('FR-020: unreadable data on Insights says so, offers Try again, and never shows an empty month', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      await openInsights();
      app.failReads(true);
      await app.add(expense('2026-10-06', 100));
      expect(screen.getByText(t("Couldn't load your data."))).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
      expect(screen.queryByText(/No spending to compare yet/)).toBeNull();
      app.failReads(false);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      await app.settle();
      expect(screen.queryByText(t("Couldn't load your data."))).toBeNull();
      expect(screen.getByRole('header', { name: 'Spending pace' })).toBeTruthy();
    });

    it('FR-020: on the summary a read error hides the card and shows the summary error', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      app.failReads(true);
      await app.add(expense('2026-10-06', 100));
      expect(screen.getByText(t("Couldn't load your data."))).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^Spending pace, / })).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('Edge: comparison day past the previous month end (30 March against February) compares with all of February', async () => {
      // 2024-03-30; February has 29 days. March by day 30: 633.84; February whole: 728.75.
      app = await renderApp({
        today: '2024-03-30',
        transactions: [
          income('2024-02-01', 198_000),
          expense('2024-02-03', 6_410),
          expense('2024-02-10', 48_000),
          expense('2024-02-14', 8_250),
          expense('2024-02-20', 2_790),
          expense('2024-02-28', 3_300),
          expense('2024-02-29', 4_125),
          income('2024-03-01', 198_000),
          expense('2024-03-02', 5_875),
          expense('2024-03-05', 48_000),
          expense('2024-03-12', 1_999),
          expense('2024-03-18', 2_250),
          expense('2024-03-29', 3_050),
          expense('2024-03-30', 2_210),
          income('2024-03-31', 7_500, 'gifts'),
        ],
      });
      expect(card('94,91 € less than last month by day 30')).toBeTruthy();
      await openInsights();
      // The later-dated income extends the line flat to day 31; February is whole.
      await app.paceChart.tapAt(dayX(31));
      expect(screen.getByText(t('Day 31'))).toBeTruthy();
      expect(screen.getByText(t('March: 633,84 €'))).toBeTruthy();
      expect(screen.getByText(t('February: 728,75 €'))).toBeTruthy();
      expect(screen.getByText(t('-94,91 € · -13%'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(2));
      expect(screen.getByText(t('March: 58,75 €'))).toBeTruthy();
      expect(screen.getByText(t('February: 0,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+58,75 €'))).toBeTruthy();
      expect(screen.queryByText(/New/i)).toBeNull();
    });

    it('Edge: a past month shorter than the previous one shows only the previous amount on the extra day', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-09-05', 10_000), expense('2026-08-10', 20_000), expense('2026-08-31', 5_000)],
      });
      await app.selectMonth({ year: 2026, month: 9 });
      await openInsights();
      await app.paceChart.tapAt(dayX(31));
      expect(screen.getByText(t('Day 31'))).toBeTruthy();
      expect(screen.getByText(t('August: 250,00 €'))).toBeTruthy();
      expect(screen.queryByText(/^September:/)).toBeNull();
    });

    it('Edge: a day past the previous month last day uses its whole month', async () => {
      app = await renderApp({
        today: '2026-11-15',
        transactions: [expense('2026-10-05', 10_000), expense('2026-10-31', 3_000), expense('2026-09-05', 4_000)],
      });
      await app.selectMonth({ year: 2026, month: 10 });
      await openInsights();
      await app.paceChart.tapAt(dayX(31));
      expect(screen.getByText(t('October: 130,00 €'))).toBeTruthy();
      expect(screen.getByText(t('September: 40,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+90,00 € · +225%'))).toBeTruthy();
    });

    it('Edge: a transaction dated after today extends the line but not the sentence', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [
          expense('2026-10-05', 10_000),
          expense('2026-10-15', 3_000),
          expense('2026-09-02', 8_000),
          expense('2026-09-20', 5_000),
        ],
      });
      expect(card('20,00 € more than last month by day 12')).toBeTruthy();
      await openInsights();
      await app.paceChart.tapAt(dayX(14));
      expect(screen.getByText(t('October: 100,00 €'))).toBeTruthy();
      expect(screen.getByText(t('September: 80,00 €'))).toBeTruthy();
      expect(screen.getByText(t('+20,00 € · +25%'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(16));
      expect(screen.getByText(t('Day 16'))).toBeTruthy();
      expect(screen.getByText(t('September: 80,00 €'))).toBeTruthy();
      expect(screen.queryByText(/^October:/)).toBeNull();
    });

    it('Edge: a later-dated income only runs the line on flat, never counts as spending', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), income('2026-10-20', 50_000), expense('2026-09-02', 8_000)],
      });
      await openInsights();
      await app.paceChart.tapAt(dayX(18));
      expect(screen.getByText(t('October: 100,00 €'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(21));
      expect(screen.queryByText(/^October:/)).toBeNull();
    });

    it('Edge: the date changing while the app is open updates the comparison day', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-13', 2_000), expense('2026-09-05', 3_000)],
      });
      expect(card('30,00 € less than last month by day 12')).toBeTruthy();
      await app.setToday('2026-10-13');
      expect(card('10,00 € less than last month by day 13')).toBeTruthy();
    });

    it('Edge: January 2000 has no previous data, so the "No data from last month" rule applies', async () => {
      app = await renderApp({ today: '2000-01-15', transactions: [expense('2000-01-05', 4_000)] });
      expect(card('No data from last month to compare')).toBeTruthy();
    });

    it('Edge: a transaction edited into another month or type is recalculated everywhere', async () => {
      app = await renderApp({
        today: '2026-10-12',
        transactions: [expense('2026-10-05', 10_000), expense('2026-09-05', 5_000)],
      });
      const id = await app.add(expense('2026-10-06', 4_000));
      expect(card('90,00 € more than last month by day 12')).toBeTruthy();
      await app.update(id, expense('2026-11-03', 4_000)); // leaves October (and today's month)
      expect(card('50,00 € more than last month by day 12')).toBeTruthy();
    });

    it('SC-001: reference set (April-October 2026) matches hand-calculated pace values', async () => {
      // Seed rows after the five edits of the reference set; expected texts are literals.
      const rows: TransactionInput[] = [
        income('2026-09-01', 231_050),
        expense('2026-09-02', 4_250, 'food'),
        expense('2026-09-04', 8_000, 'bills'),
        expense('2026-09-05', 1_500, 'transport'),
        expense('2026-09-07', 6_120, 'leisure'),
        expense('2026-09-09', 52_000, 'housing'),
        expense('2026-09-11', 3_175, 'food'),
        expense('2026-09-12', 2_999, 'shopping'),
        expense('2026-09-30', 7_777, 'other'),
        expense('2026-09-13', 18_930, 'shopping'),
        income('2026-10-01', 231_050),
        expense('2026-10-01', 1_850, 'food'),
        expense('2026-10-06', 11_000, 'bills'),
        expense('2026-10-08', 2_975, 'food'),
        expense('2026-10-09', 62_190, 'housing'),
        expense('2026-10-11', 1_450, 'shopping'),
        expense('2026-10-15', 6_500, 'shopping'),
      ];
      app = await renderApp({ today: '2026-10-12', transactions: rows });
      // October by day 12: 18.50 + 110.00 + 29.75 + 621.90 + 14.50 = 794.65
      // September by day 12: 42.50 + 80.00 + 15.00 + 61.20 + 520.00 + 31.75 + 29.99 = 780.44
      expect(card('14,21 € more than last month by day 12')).toBeTruthy();
      await openInsights();
      await app.paceChart.tapAt(dayX(8)); // October 18.50 + 110.00 + 29.75 = 158.25; September 198.70
      expect(screen.getByText(t('October: 158,25 €'))).toBeTruthy();
      expect(screen.getByText(t('September: 198,70 €'))).toBeTruthy();
      expect(screen.getByText(t('-40,45 € · -20%'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(15)); // line ends on day 15 (the 65.00 shopping)
      expect(screen.getByText(t('October: 859,65 €'))).toBeTruthy();
      await app.paceChart.tapAt(dayX(16));
      expect(screen.queryByText(/^October:/)).toBeNull();
    });
  });
});
