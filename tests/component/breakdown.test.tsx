import { act, render, screen } from '@testing-library/react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { openTestDatabase } from '../helpers/betterSqliteAdapter';

// Same setup as summaryScreen.test.tsx: October 2026, a Spanish region, a real SQLite database.
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), [effect]),
  };
});

const SummaryScreen = require('@/app/index').default;

const eur = (amount: string) => `${amount} €`;
const expense = (amountCents: number, category: string): TransactionInput => ({
  type: 'expense',
  amountCents,
  date: '2026-10-05',
  category,
  note: null,
});
const income = (amountCents: number): TransactionInput => ({
  type: 'income',
  amountCents,
  date: '2026-10-01',
  category: 'salary',
  note: null,
});

async function renderMonth(rows: TransactionInput[]) {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));

  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <SummaryScreen />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await act(async () => {});
}

/** Breakdown rows in screen order, by their spoken labels ("Food, 150,00 €, 30 percent"). */
const breakdownRows = () =>
  screen.getAllByLabelText(/ percent$/).map((el) => el.props.accessibilityLabel as string);

beforeEach(() => mockOpen.mockReset());

it('shows each category with its amount and share, largest first (FR-016)', async () => {
  await renderMonth([expense(5000, 'transport'), expense(30000, 'housing'), expense(15000, 'food')]);

  expect(screen.getByText('Spending by category')).toBeTruthy();
  expect(breakdownRows()).toEqual([
    `Housing, ${eur('300,00')}, 60 percent`,
    `Food, ${eur('150,00')}, 30 percent`,
    `Transport, ${eur('50,00')}, 10 percent`,
  ]);
  expect(screen.getByText('60%')).toBeTruthy();
  expect(screen.getByText('30%')).toBeTruthy();
  expect(screen.getByText('10%')).toBeTruthy();
});

it('orders ties alphabetically', async () => {
  await renderMonth([expense(1000, 'shopping'), expense(1000, 'bills'), expense(1000, 'food')]);
  expect(breakdownRows().map((label) => label.split(',')[0])).toEqual(['Bills', 'Food', 'Shopping']);
});

it('shows "<1%" and reads it as "less than 1 percent"', async () => {
  await renderMonth([expense(30000, 'food'), expense(100, 'bills')]);
  expect(screen.getByText('<1%')).toBeTruthy();
  expect(screen.getByLabelText(`Bills, ${eur('1,00')}, less than 1 percent`)).toBeTruthy();
});

it('merges a category\'s expenses and leaves out categories with none', async () => {
  await renderMonth([expense(1000, 'food'), expense(2000, 'food'), income(50000)]);
  expect(breakdownRows()).toEqual([`Food, ${eur('30,00')}, 100 percent`]);
  expect(screen.queryByLabelText(/^Transport, /)).toBeNull();
});

it('shows "No expenses this month." when there is only income', async () => {
  await renderMonth([income(200000)]);
  expect(screen.getByText('Spending by category')).toBeTruthy();
  expect(screen.getByText('No expenses this month.')).toBeTruthy();
  expect(screen.queryAllByLabelText(/ percent$/)).toHaveLength(0);
});

it('is hidden in an empty month', async () => {
  await renderMonth([]);
  expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
  expect(screen.queryByText('Spending by category')).toBeNull();
  expect(screen.queryByText('No expenses this month.')).toBeNull();
});
