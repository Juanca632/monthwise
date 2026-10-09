// Acceptance tests for 002 User Story 4: the month control and the month picker.
// Black box: only specs/002-monthly-charts/spec.md and contracts/ were read.
// Region is es-ES (the harness default), font scale 1.0, today 2026-10-12 unless said otherwise.
// Touch sizes, large text and the look of the picker need a phone (not testable here).
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Reference data: September 2026 spent 800,00 and August 2026 spent 1.000,00 (July 800,00).
const DATA: TransactionInput[] = [
  expense('2026-07-10', 80_000),
  expense('2026-08-10', 100_000),
  expense('2026-09-10', 80_000),
  income('2026-09-01', 200_000),
  expense('2026-10-05', 30_000),
  expense('2024-03-10', 10_000),
];

/** The month control (only query it while the picker is closed: the grid repeats month names). */
const control = (name: string) => screen.getByRole('button', { name });
const pickerOpen = () => screen.queryByRole('header', { name: 'Choose month' }) !== null;

async function openPicker(currentName: string) {
  fireEvent.press(control(currentName));
  await app.settle();
  expect(pickerOpen()).toBe(true);
}

async function press(name: string) {
  fireEvent.press(screen.getByRole('button', { name }));
  await app.settle();
}

async function openInsights() {
  fireEvent.press(screen.getByRole('button', { name: /^Spending pace, / }));
  await app.settle();
}

async function start(opts: { today?: string; transactions?: TransactionInput[]; screenReader?: boolean } = {}) {
  app = await renderApp({ today: '2026-10-12', transactions: DATA, ...opts });
}

afterEach(() => {
  app?.unmount();
});

describe('US4: jump to any month', () => {
  describe('acceptance scenarios', () => {
    it('US4-AS1: tapping "October 2026" opens "Choose month" on 2026 with October selected and November and December unavailable', async () => {
      await start();
      await openPicker('October 2026');

      expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
      expect(screen.getByLabelText('2026')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'October 2026', selected: true })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'November 2026', disabled: true })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'December 2026', disabled: true })).toBeTruthy();
      // Available months are neither selected nor disabled.
      expect(screen.queryByRole('button', { name: 'September 2026', disabled: true })).toBeNull();
      expect(screen.queryByRole('button', { name: 'September 2026', selected: true })).toBeNull();
      // All twelve months of the year are in the grid.
      for (const m of MONTH_NAMES) {
        expect(screen.getByRole('button', { name: `${m} 2026` })).toBeTruthy();
      }
      expect(screen.getByRole('button', { name: 'This month' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
      // Still on the summary.
      expect(app.screen).toBe('summary');
    });

    it('US4-AS2: "Previous year" twice then "March 2024" closes the picker and the summary shows March 2024', async () => {
      await start();
      await openPicker('October 2026');

      await press('Previous year');
      expect(screen.getByLabelText('2025')).toBeTruthy();
      expect(pickerOpen()).toBe(true);
      await press('Previous year');
      expect(screen.getByLabelText('2024')).toBeTruthy();
      expect(pickerOpen()).toBe(true);
      // Moving the year does not change the month behind the picker.
      expect(screen.queryByRole('button', { name: 'March 2024', selected: true })).toBeNull();

      await press('March 2024');
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('summary');
      expect(control('March 2024')).toBeTruthy();
      // The data on the summary is March 2024's: 100,00 spent, nothing in February.
      expect(
        screen.getByRole('button', { name: t('Spending pace, No data from February to compare') }),
      ).toBeTruthy();
    });

    it('US4-AS3: "Previous year" is disabled on 2000 and "Next year" on the current year', async () => {
      await start();
      await openPicker('October 2026');
      expect(screen.getByRole('button', { name: 'Next year', disabled: true })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Previous year', disabled: true })).toBeNull();

      // 26 taps back from 2026 reach 2000.
      for (let i = 0; i < 26; i++) {
        await press('Previous year');
      }
      expect(screen.getByLabelText('2000')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Previous year', disabled: true })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Next year', disabled: false })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'January 2000' })).toBeTruthy();

      // A press on the disabled control changes nothing.
      await press('Previous year');
      expect(screen.getByLabelText('2000')).toBeTruthy();

      // One tap forward moves exactly one year.
      await press('Next year');
      expect(screen.getByLabelText('2001')).toBeTruthy();
    });

    it('US4-AS4: from March 2024, "This month" closes the picker and shows the current month', async () => {
      await start();
      await app.selectMonth({ year: 2024, month: 3 });
      await openPicker('March 2024');
      // Opens on the selected month's year with that month marked.
      expect(screen.getByLabelText('2024')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'March 2024', selected: true })).toHaveLength(1);

      await press('This month');
      expect(pickerOpen()).toBe(false);
      expect(control('October 2026')).toBeTruthy();
      expect(
        // October by day 12: 300,00; September by day 12: 800,00.
        screen.getByRole('button', { name: t('Spending pace, 500,00 € less than last month by day 12') }),
      ).toBeTruthy();
    });

    it('US4-AS5: "Close" leaves the month unchanged', async () => {
      await start();
      await app.selectMonth({ year: 2024, month: 3 });
      await openPicker('March 2024');
      await press('Previous year');
      expect(screen.getByLabelText('2023')).toBeTruthy();
      await press('Close');
      expect(pickerOpen()).toBe(false);
      expect(control('March 2024')).toBeTruthy();
      // Reopening starts on the selected month's year again.
      await openPicker('March 2024');
      expect(screen.getByLabelText('2024')).toBeTruthy();
    });

    it('US4-AS5: the system back action closes the picker, leaves the month unchanged and stays on the screen', async () => {
      await start();
      await app.selectMonth({ year: 2024, month: 3 });
      await openPicker('March 2024');
      await app.back();
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('summary');
      expect(control('March 2024')).toBeTruthy();
    });

    it('US4-AS5: tapping outside the picker closes it and leaves the month unchanged', async () => {
      await start();
      await app.selectMonth({ year: 2024, month: 3 });
      await openPicker('March 2024');
      await app.tapOutsidePicker();
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('summary');
      expect(control('March 2024')).toBeTruthy();
    });

    it('US4-AS6: picking August 2026 on Insights shows August there, and Back shows the summary for August', async () => {
      await start();
      await openInsights();
      expect(app.screen).toBe('insights');

      await openPicker('October 2026');
      // The picker is over Insights, not a different screen.
      expect(app.screen).toBe('insights');
      await press('August 2026');
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('insights');
      expect(control('August 2026')).toBeTruthy();
      // Insights data is August's: 1.000,00 against July's 800,00.
      expect(screen.getByText(t('200,00 € more than July'))).toBeTruthy();

      await press('Back');
      expect(app.screen).toBe('summary');
      expect(control('August 2026')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: t('Spending pace, 200,00 € more than July') }),
      ).toBeTruthy();
    });

    it('US4-AS7: "View month" on the open September detail shows September in every section with no detail open', async () => {
      await start();
      await openInsights();
      fireEvent.press(screen.getByRole('button', { name: 'September' }));
      expect(screen.getByRole('button', { name: 'View month' })).toBeTruthy();
      await press('View month');

      expect(app.screen).toBe('insights');
      expect(control('September 2026')).toBeTruthy();
      // April to September: July, August and September have data. Income 2.000,00, expenses
      // 800,00 + 1.000,00 + 800,00 = 2.600,00, saved -600,00 = -30%.
      expect(screen.getByText(t('Saved -600,00 € in 3 months · -30%'))).toBeTruthy();
      expect(screen.queryByText(/^Income: /)).toBeNull();
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
      // Pace section: September 800,00 against August 1.000,00.
      expect(screen.getByText(t('200,00 € less than August'))).toBeTruthy();

      await press('Back');
      expect(control('September 2026')).toBeTruthy();
    });
  });

  describe('month control (FR-026, FR-032)', () => {
    it('FR-026: the summary shows the month as a button labelled "October 2026" with the hint "Changes the month"', async () => {
      await start();
      const c = control('October 2026');
      expect(c.props.accessibilityHint).toBe('Changes the month');
      expect(within(c).getByText('October 2026')).toBeTruthy();
    });

    it('FR-026: after opening Insights from the Spending pace card the month control is on Insights with the same label and hint', async () => {
      await start();
      await openInsights();
      expect(app.screen).toBe('insights');
      const c = control('October 2026');
      expect(c.props.accessibilityHint).toBe('Changes the month');
      expect(within(c).getByText('October 2026')).toBeTruthy();
      expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy();
    });

    it('FR-026: after a past month is selected, the control on the summary and on Insights shows it', async () => {
      await start();
      await app.selectMonth({ year: 2026, month: 8 });
      expect(control('August 2026').props.accessibilityHint).toBe('Changes the month');
      await openInsights();
      expect(control('August 2026').props.accessibilityHint).toBe('Changes the month');
      await press('Back');
      expect(control('August 2026')).toBeTruthy();
    });

    it("FR-026: 001's \"Previous month\" and \"Next month\" buttons are gone from the summary and from Insights", async () => {
      await start();
      expect(screen.queryByRole('button', { name: /^Previous month/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Next month/ })).toBeNull();
      await app.selectMonth({ year: 2026, month: 8 });
      expect(screen.queryByRole('button', { name: /^Previous month/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Next month/ })).toBeNull();
      await openInsights();
      expect(screen.queryByRole('button', { name: /^Previous month/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Next month/ })).toBeNull();
    });

    it('FR-026: the control works while the summary shows its error state', async () => {
      await start();
      app.failReads(true);
      await app.selectMonth({ year: 2026, month: 9 });
      expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
      await openPicker('September 2026');
      await press('August 2026');
      expect(pickerOpen()).toBe(false);
      expect(control('August 2026')).toBeTruthy();
    });

    it('FR-026: the control works while Insights shows its error state', async () => {
      await start();
      await openInsights();
      app.failReads(true);
      await app.selectMonth({ year: 2026, month: 9 });
      expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
      await openPicker('September 2026');
      await press('August 2026');
      expect(control('August 2026')).toBeTruthy();
      // Still an error, never an empty month.
      expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
    });
  });

  describe('month picker (FR-027, FR-028)', () => {
    it('FR-027: the picker opens on the selected month\'s year, also from Insights', async () => {
      await start();
      await app.selectMonth({ year: 2024, month: 3 });
      await openInsights();
      await openPicker('March 2024');
      expect(screen.getByLabelText('2024')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'March 2024', selected: true })).toHaveLength(1);
      // 2024 is entirely in the past: nothing is unavailable.
      expect(screen.queryAllByRole('button', { name: / 2024$/, disabled: true })).toHaveLength(0);
    });

    it('FR-027: months after the current month cannot be chosen', async () => {
      await start();
      await openPicker('October 2026');
      fireEvent.press(screen.getByRole('button', { name: 'November 2026', disabled: true }));
      await app.settle();
      expect(pickerOpen()).toBe(true);
      await press('Close');
      expect(control('October 2026')).toBeTruthy();
    });

    it('FR-027: in the current year only the months after today are unavailable (January to October are available)', async () => {
      await start();
      await openPicker('October 2026');
      for (const m of MONTH_NAMES.slice(0, 10)) {
        expect(screen.queryByRole('button', { name: `${m} 2026`, disabled: true })).toBeNull();
      }
    });

    it('FR-027: when today moves into a new month the current year\'s unavailable months follow it', async () => {
      await start();
      await app.setToday('2026-11-01');
      await openPicker('November 2026');
      expect(screen.queryByRole('button', { name: 'November 2026', disabled: true })).toBeNull();
      expect(screen.getByRole('button', { name: 'December 2026', disabled: true })).toBeTruthy();
    });

    it('FR-028: choosing the month already selected only closes the picker', async () => {
      await start();
      await app.selectMonth({ year: 2026, month: 8 });
      await openPicker('August 2026');
      fireEvent.press(screen.getByRole('button', { name: 'August 2026', selected: true }));
      await app.settle();
      expect(pickerOpen()).toBe(false);
      expect(control('August 2026')).toBeTruthy();
      expect(app.screen).toBe('summary');
    });

    it('FR-028: "This month" from Insights closes the picker and Insights shows the current month', async () => {
      await start();
      await app.selectMonth({ year: 2026, month: 8 });
      await openInsights();
      await openPicker('August 2026');
      await press('This month');
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('insights');
      expect(control('October 2026')).toBeTruthy();
      await press('Back');
      expect(control('October 2026')).toBeTruthy();
    });

    it('FR-028: "Close", back and tapping outside leave Insights\' month unchanged', async () => {
      await start();
      await openInsights();

      await openPicker('October 2026');
      await press('Close');
      expect(control('October 2026')).toBeTruthy();

      await openPicker('October 2026');
      await app.back();
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('insights');
      expect(control('October 2026')).toBeTruthy();

      await openPicker('October 2026');
      await app.tapOutsidePicker();
      expect(pickerOpen()).toBe(false);
      expect(app.screen).toBe('insights');
      expect(control('October 2026')).toBeTruthy();
    });
  });

  describe('shared month (FR-029) and chart details (FR-031)', () => {
    it('FR-029: a month chosen on the summary is the month Insights opens on', async () => {
      await start();
      await openPicker('October 2026');
      await press('August 2026');
      await openInsights();
      expect(control('August 2026')).toBeTruthy();
      expect(screen.getByText(t('200,00 € more than July'))).toBeTruthy();
    });

    it('FR-031: choosing a month in the picker hides an open pace-chart detail', async () => {
      await start({
        transactions: [expense('2026-10-05', 12_000), expense('2026-09-05', 10_000), expense('2026-08-05', 5_000)],
      });
      await openInsights();
      await app.paceChart.tapAt(75); // day 8: x from 70 to 80
      expect(screen.getByText('Day 8')).toBeTruthy();

      await openPicker('October 2026');
      await press('September 2026');
      expect(screen.queryByText('Day 8')).toBeNull();
      expect(screen.queryByText(/^Day \d+$/)).toBeNull();
    });

    it('FR-031: choosing a month in the picker hides an open trend detail', async () => {
      await start();
      await openInsights();
      fireEvent.press(screen.getByRole('button', { name: 'September' }));
      expect(screen.queryAllByText(/^Income: /)).toHaveLength(1);

      await openPicker('October 2026');
      await press('August 2026');
      expect(screen.queryByText(/^Income: /)).toBeNull();
      expect(screen.queryByRole('button', { name: 'View month' })).toBeNull();
    });

    it('FR-031: closing the picker without choosing keeps the open trend detail', async () => {
      await start();
      await openInsights();
      fireEvent.press(screen.getByRole('button', { name: 'September' }));
      await openPicker('October 2026');
      await press('Close');
      expect(screen.queryAllByText(/^Income: /)).toHaveLength(1);
    });

    it('FR-031: when midnight starts a new month, a selected current month moves on, on the summary and on Insights', async () => {
      await start();
      await app.setToday('2026-11-01');
      expect(control('November 2026')).toBeTruthy();
      await openInsights();
      expect(control('November 2026')).toBeTruthy();
      await app.setToday('2026-12-01');
      expect(control('December 2026')).toBeTruthy();
    });

    it('FR-031: when midnight starts a new month, a past selected month stays', async () => {
      await start();
      await app.selectMonth({ year: 2026, month: 8 });
      await app.setToday('2026-11-01');
      expect(control('August 2026')).toBeTruthy();
      await openInsights();
      expect(control('August 2026')).toBeTruthy();
    });

    it('FR-029: adding a transaction keeps the picked month on Insights (the harness refocuses the screen)', async () => {
      await start();
      await openInsights();
      await openPicker('October 2026');
      await press('August 2026');
      await app.add(expense('2026-08-20', 5_000));
      expect(control('August 2026')).toBeTruthy();
      // August is now 1.050,00 against July's 800,00.
      expect(screen.getByText(t('250,00 € more than July'))).toBeTruthy();
    });
  });

  describe('screen reader (FR-032)', () => {
    it('FR-032: control, year, year buttons, months, "This month" and "Close" are announced by name, state and hint', async () => {
      await start({ screenReader: true });
      const c = control('October 2026');
      expect(c.props.accessibilityHint).toBe('Changes the month');
      fireEvent.press(c);
      await app.settle();

      expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
      expect(screen.getByLabelText('2026')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Previous year', disabled: false })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Next year', disabled: true })).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'October 2026', selected: true })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'December 2026', disabled: true })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'This month' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    });

    it('FR-032: turning the screen reader on later does not change the picker\'s announcements', async () => {
      await start();
      await app.setScreenReader(true);
      await openPicker('October 2026');
      expect(screen.getByRole('button', { name: 'Next year', disabled: true })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    });
  });

  describe('success criteria', () => {
    it('SC-006: March of two years before the current year is 4 taps from the current month, and back is 2 taps', async () => {
      await start();
      // Taps: month control, Previous year, Previous year, "March 2024".
      fireEvent.press(control('October 2026'));
      await app.settle();
      fireEvent.press(screen.getByRole('button', { name: 'Previous year' }));
      await app.settle();
      fireEvent.press(screen.getByRole('button', { name: 'Previous year' }));
      await app.settle();
      fireEvent.press(screen.getByRole('button', { name: 'March 2024' }));
      await app.settle();
      expect(control('March 2024')).toBeTruthy();

      // Taps: month control, "This month".
      fireEvent.press(control('March 2024'));
      await app.settle();
      fireEvent.press(screen.getByRole('button', { name: 'This month' }));
      await app.settle();
      expect(control('October 2026')).toBeTruthy();
    });
  });
});
