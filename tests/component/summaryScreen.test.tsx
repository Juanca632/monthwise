import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

// Today is fixed so "the current month" is October 2026.
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
// Like the other component suites: the real expo-font needs expo-asset, which npm nests under
// expo/ where Jest cannot resolve it. Icons render as plain text with this mock.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

// The real router needs a navigator. Focus effects run on mount and when their callback changes,
// like a focused screen; `focus()` replays the latest one as a new focus event.
const mockPush = jest.fn();
const mockFocus: { current: (() => void) | null } = { current: null };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void) => {
      mockFocus.current = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});

const SummaryScreen = require('@/app/index').default;

// es-ES puts a no-break space before the €.
const eur = (amount: string) => `${amount} €`;

const expense = (amountCents: number, date: string, category: string, note: string | null = null) =>
  ({ type: 'expense', amountCents, date, category, note }) satisfies TransactionInput;
const income = (amountCents: number, date: string, category: string) =>
  ({ type: 'income', amountCents, date, category, note: null }) satisfies TransactionInput;

/** A migrated in-memory database the provider will open; tests can write to it directly. */
async function databaseWith(rows: TransactionInput[]): Promise<TestDatabase> {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  return db;
}

function renderSummary() {
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <SummaryScreen />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
}

/** Lets the database open and the month query finish. */
const flush = () => act(async () => {});

const addButton = () => screen.getByRole('button', { name: 'Add transaction' });

ignoreListBatchingWarnings();

beforeEach(() => {
  mockOpen.mockReset();
  mockPush.mockClear();
});

it('opens on the current month (FR-014)', async () => {
  await databaseWith([]);
  renderSummary();
  await flush();
  expect(screen.getByRole('header', { name: 'October 2026' })).toBeTruthy();
});

it('shows the loading indicator and Add, with no zeros, while the database opens (FR-002, FR-023)', () => {
  mockOpen.mockImplementation(() => new Promise(() => {}));
  renderSummary();

  expect(screen.getByLabelText('Loading')).toBeTruthy();
  expect(addButton()).toBeTruthy();
  expect(screen.queryByText(eur('0,00'))).toBeNull();
  expect(screen.queryByText('No transactions this month yet.')).toBeNull();
});

it('Add opens the new transaction form', async () => {
  await databaseWith([]);
  renderSummary();
  await flush();
  fireEvent.press(addButton());
  expect(mockPush).toHaveBeenCalledWith('/transaction/new');
});

it('shows the error state with Try again and Add when the database fails to open (FR-024)', async () => {
  mockOpen.mockRejectedValueOnce(new Error('disk I/O error'));
  renderSummary();
  await flush();

  expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
  expect(addButton()).toBeTruthy();
  expect(screen.queryByText(eur('0,00'))).toBeNull();

  // Try again reopens the database, then loads the month.
  await databaseWith([]);
  fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByLabelText('Loading')).toBeTruthy();
  // findBy waits inside act() until the reopened database has loaded and the list has settled.
  expect(await screen.findByText('No transactions this month yet.')).toBeTruthy();
});

it('shows the error state when the month query fails (FR-024)', async () => {
  const db = await databaseWith([]);
  // Opening succeeds (the version is already 1); the query then has no table to read.
  db.raw.exec('DROP TABLE transactions');
  renderSummary();
  await flush();

  expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});

it('shows zero totals and the empty line for a month with no transactions (FR-022)', async () => {
  // A transaction in another month must not count.
  await databaseWith([expense(5000, '2026-09-30', 'food')]);
  renderSummary();
  await flush();

  expect(screen.getAllByText(eur('0,00'))).toHaveLength(3);
  expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
  expect(screen.getByText('Tap Add to record an income or expense.')).toBeTruthy();
  expect(screen.queryByText('Transactions')).toBeNull();
  expect(addButton()).toBeTruthy();
});

it('shows totals, a negative balance read as "minus", and the list newest first (FR-015, FR-017)', async () => {
  await databaseWith([
    income(200000, '2026-10-01', 'salary'),
    expense(15000, '2026-10-05', 'food', 'lunch'),
    expense(200000, '2026-10-03', 'housing'),
  ]);
  renderSummary();
  await flush();

  expect(screen.getByLabelText(`Income, ${eur('2.000,00')}`)).toBeTruthy();
  expect(screen.getByLabelText(`Expenses, ${eur('2.150,00')}`)).toBeTruthy();
  // Shown with its minus sign, never by color alone.
  const balance = screen.getByLabelText(`Balance, minus ${eur('150,00')}`);
  expect(within(balance).getByText(eur('-150,00'))).toBeTruthy();

  expect(screen.getByText('Transactions')).toBeTruthy();
  // List rows only: they end with a date, unlike the "Income, …" stat pill.
  const items = screen
    .getAllByLabelText(/^(Expense|Income), .+ 2026/)
    .map((el) => el.props.accessibilityLabel);
  expect(items).toEqual([
    `Expense, Food, ${eur('150,00')}, 5 October 2026, note: lunch`,
    `Expense, Housing, ${eur('2.000,00')}, 3 October 2026`,
    `Income, Salary, ${eur('2.000,00')}, 1 October 2026`,
  ]);
  // The row shows only its note; its date is its day's header (FR-017).
  expect(screen.getByText('lunch')).toBeTruthy();
  expect(screen.queryByText(/05\/10\/2026/)).toBeNull();
});

it('groups the list by day, newest first, with each day\'s net (FR-017, FR-031)', async () => {
  await databaseWith([
    income(200000, '2026-10-15', 'salary'),
    expense(3000, '2026-10-15', 'food'),
    expense(1200, '2026-10-14', 'food'),
    income(500, '2026-10-05', 'other'),
    expense(500, '2026-10-05', 'food'),
  ]);
  renderSummary();
  await flush();

  const headers = screen.getAllByRole('header').filter((h) => /, net /.test(h.props.accessibilityLabel));
  expect(headers.map((h) => h.props.accessibilityLabel)).toEqual([
    `Today, net ${eur('1.970,00')}`,
    `Yesterday, net minus ${eur('12,00')}`,
    `Monday 5 October, net ${eur('0,00')}`,
  ]);
  // Shown: + above zero, minus below, no sign at zero.
  expect(within(headers[0]).getByText('Today')).toBeTruthy();
  expect(within(headers[0]).getByText(`+${eur('1.970,00')}`)).toBeTruthy();
  expect(within(headers[1]).getByText(`-${eur('12,00')}`)).toBeTruthy();
  expect(within(headers[2]).getByText('Mon 5 Oct')).toBeTruthy();
  expect(within(headers[2]).getByText(eur('0,00'))).toBeTruthy();
});

it('updates on focus after a change without showing the loading state (FR-019, FR-023)', async () => {
  const db = await databaseWith([expense(1250, '2026-10-02', 'food')]);
  renderSummary();
  await flush();
  expect(screen.getByLabelText(`Expenses, ${eur('12,50')}`)).toBeTruthy();

  // As if a form had saved and closed.
  await createTransactionRepository(db).create(expense(750, '2026-10-04', 'transport'), 99);
  act(() => mockFocus.current!());
  expect(screen.queryByLabelText('Loading')).toBeNull();
  expect(screen.getByLabelText(`Expenses, ${eur('12,50')}`)).toBeTruthy();

  await flush();
  expect(screen.getByLabelText(`Expenses, ${eur('20,00')}`)).toBeTruthy();
  expect(screen.getAllByLabelText(/^Expense, /)).toHaveLength(2);
});

it('has no dev tools unless the build sets EXPO_PUBLIC_DEV_TOOLS', async () => {
  await databaseWith([]);
  renderSummary();
  await flush();
  expect(screen.queryByText('Seed 1,000 transactions')).toBeNull();
  expect(screen.queryByText('Simulate storage error')).toBeNull();
});
