import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

// The See all page (contracts/ui-screens.md, All transactions; FR-017).
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-10-15', getToday: () => '2026-10-15' }));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-localization', () => ({ useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }] }));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFocus: { current: (() => void) | null } = { current: null };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useFocusEffect: (effect: () => void) => {
      mockFocus.current = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});

const AllTransactionsScreen = require('@/app/transactions').default;

const expense = (amountCents: number, date: string): TransactionInput => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note: null,
});
const flush = () => act(async () => {});
const items = () => screen.queryAllByLabelText(/^Expense, Food, /);

async function databaseWith(rows: TransactionInput[]): Promise<TestDatabase> {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  return db;
}

function renderScreen() {
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <AllTransactionsScreen />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
}

ignoreListBatchingWarnings();

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockOpen.mockReset();
});

const SEVEN = Array.from({ length: 7 }, (_, i) =>
  expense(100 * (i + 1), `2026-10-${String(15 - Math.floor(i / 2)).padStart(2, '0')}`),
);

it('lists every transaction of the month by day, with the month in the header', async () => {
  // Six, more than the summary's five; the list's first render window holds them with their
  // three day headers.
  await databaseWith(SEVEN.slice(0, 6));
  renderScreen();
  await flush();
  expect(screen.getByRole('header', { name: 'Transactions' })).toBeTruthy();
  expect(screen.getByText('October 2026')).toBeTruthy();
  expect(items()).toHaveLength(6);
  expect(screen.getAllByLabelText(/, net /)).toHaveLength(3);
});

it('opens an item and goes back', async () => {
  await databaseWith(SEVEN);
  renderScreen();
  await flush();
  fireEvent.press(items()[0]);
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/transaction/[id]' }));
  fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('reloads its month on focus (FR-019)', async () => {
  const db = await databaseWith(SEVEN.slice(0, 2));
  renderScreen();
  await flush();
  expect(items()).toHaveLength(2);
  await createTransactionRepository(db).create(expense(999, '2026-10-01'), 99);
  await act(async () => mockFocus.current!());
  await flush();
  expect(items()).toHaveLength(3);
});

it('shows loading, then the empty card for a month with none', async () => {
  let resolve!: (db: unknown) => void;
  mockOpen.mockReturnValue(new Promise((r) => (resolve = r)));
  renderScreen();
  await flush();
  expect(screen.getByLabelText('Loading')).toBeTruthy();
  const db = openTestDatabase();
  await openAndMigrate(db);
  await act(async () => resolve(Object.assign(db, { closeAsync: async () => db.close() })));
  await flush();
  expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
});

it('shows the error with Try again when the database fails to open', async () => {
  mockOpen.mockRejectedValue(new Error('cannot open'));
  renderScreen();
  await flush();
  expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});

it('renders only the first window of a 1,000-row month (SC-004)', async () => {
  await databaseWith(
    Array.from({ length: 1000 }, (_, i) => expense(100 + i, `2026-10-${String((i % 15) + 1).padStart(2, '0')}`)),
  );
  renderScreen();
  await flush();
  const shown = items().length;
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(100);
});
