import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import type { SqlParam } from '@/data/sqlDatabase';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider, useSummaryNotice, type SummaryNoticeValue } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

/**
 * A clock the test controls. `useToday` re-reads it only on `comeBackToForeground`, like the real
 * hook on an AppState "active" event.
 */
const mockClock = { today: '2026-10-15', listeners: new Set<() => void>() };
jest.mock('@/hooks/useToday', () => {
  const { useEffect, useState: useStateReal } = require('react');
  return {
    getToday: () => mockClock.today,
    useToday: () => {
      const [today, setToday] = useStateReal(mockClock.today);
      useEffect(() => {
        const listener = () => setToday(mockClock.today);
        mockClock.listeners.add(listener);
        return () => mockClock.listeners.delete(listener);
      }, []);
      return today;
    },
  };
});
const comeBackToForeground = (today: string) =>
  act(() => {
    mockClock.today = today;
    mockClock.listeners.forEach((listener) => listener());
  });

jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
// See summaryScreen.test.tsx: the real expo-font needs expo-asset, which Jest cannot resolve.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

// See transactionFormEdit.test.tsx: `push` opens the add form over the summary, `back` closes it
// and gives the summary focus again.
const mockNav = { open: () => {}, close: () => {}, focusSummary: null as (() => void) | null };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: () => mockNav.open(), back: () => mockNav.close() }),
    useNavigation: () => ({ dispatch: jest.fn() }),
    useFocusEffect: (effect: () => void) => {
      mockNav.focusSummary = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => {} }));

const SummaryScreen = require('@/app/index').default;
const NewTransactionScreen = require('@/app/transaction/new').default;

const month: { current: SelectedMonthValue | null } = { current: null };
const notice: { current: SummaryNoticeValue | null } = { current: null };

function App() {
  month.current = useSelectedMonth();
  notice.current = useSummaryNotice();
  const [adding, setAdding] = useState(false);
  mockNav.open = () => setAdding(true);
  mockNav.close = () => {
    setAdding(false);
    mockNav.focusSummary?.();
  };
  return (
    <>
      <SummaryScreen />
      {adding && <NewTransactionScreen />}
    </>
  );
}

/**
 * Month queries for `slowMonthStart` wait until `release()`; everything else answers at once.
 * Used to deliver a reply after the user has already moved to another month.
 */
function slowMonth(db: TestDatabase, slowMonthStart: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const getAllAsync = db.getAllAsync.bind(db);
  db.getAllAsync = async <T,>(sql: string, ...params: SqlParam[]): Promise<T[]> => {
    // Only the month's own list (newest first): since 002 the next month's load also reads this
    // month, as its previous month, and that read must not wait.
    if (params[0] === slowMonthStart && sql.includes('ORDER BY date DESC')) await gate;
    return getAllAsync<T>(sql, ...params);
  };
  return { release };
}

const flush = () => act(async () => {});
const eur = (amount: string) => `${amount} €`;

async function renderApp(rows: TransactionInput[], prepare?: (db: TestDatabase) => void) {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  prepare?.(db);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <App />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await flush();
  return db;
}

const header = (name: string) => screen.getByRole('header', { name });
const previousButton = () => screen.queryByRole('button', { name: /^Previous month, / });
const nextButton = () => screen.queryByRole('button', { name: /^Next month, / });
const goPrevious = async () => {
  fireEvent.press(previousButton()!);
  await flush();
};
const goNext = async () => {
  fireEvent.press(nextButton()!);
  await flush();
};

const income = (amountCents: number, date: string): TransactionInput => ({
  type: 'income',
  amountCents,
  date,
  category: 'salary',
  note: null,
});
const expense = (amountCents: number, date: string): TransactionInput => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note: null,
});

ignoreListBatchingWarnings();

beforeEach(() => {
  mockOpen.mockReset();
  mockClock.today = '2026-10-15';
});

describe('limits (FR-021)', () => {
  it('hides next on the current month and labels previous with the month it goes to', async () => {
    await renderApp([]);
    expect(header('October 2026')).toBeTruthy();
    expect(nextButton()).toBeNull();
    expect(previousButton()!.props.accessibilityLabel).toBe('Previous month, September 2026');
  });

  it('hides previous on January 2000', async () => {
    await renderApp([]);
    act(() => month.current!.setSelected({ year: 2000, month: 2 }));
    await flush();
    await goPrevious();

    expect(header('January 2000')).toBeTruthy();
    expect(previousButton()).toBeNull();
    expect(nextButton()!.props.accessibilityLabel).toBe('Next month, February 2000');
  });
});

it('goes back to an empty past month and forward to the current month again', async () => {
  await renderApp([expense(1250, '2026-10-02')]);
  await goPrevious();

  expect(header('September 2026')).toBeTruthy();
  expect(screen.getAllByText(eur('0,00'))).toHaveLength(3);
  expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
  expect(nextButton()!.props.accessibilityLabel).toBe('Next month, October 2026');

  await goNext();
  expect(header('October 2026')).toBeTruthy();
  expect(nextButton()).toBeNull();
  expect(screen.getByLabelText(`Expenses, ${eur('12,50')}`)).toBeTruthy();
});

it('carries no balance from one month to the next (FR-018)', async () => {
  await renderApp([income(10000, '2026-09-10'), expense(5000, '2026-10-02')]);
  expect(screen.getByLabelText(`Balance, minus ${eur('50,00')}`)).toBeTruthy();

  await goPrevious();
  expect(screen.getByLabelText(`Balance, ${eur('100,00')}`)).toBeTruthy();
});

it('Add on a past month defaults to its last day, and the saved transaction lands there (FR-003, FR-020)', async () => {
  await renderApp([]);
  await goPrevious();
  fireEvent.press(screen.getByRole('button', { name: 'Add transaction' }));
  await flush();

  expect(screen.getByText('30/09/2026')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('amount-input'), '8');
  fireEvent.press(screen.getByRole('button', { name: 'Food' }));
  fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await flush();
  await flush();

  expect(header('September 2026')).toBeTruthy();
  expect(screen.getByLabelText(/^Expense, Food, 8,00 €, 30 September 2026$/)).toBeTruthy();
});

it('discards a slow reply for a month the user already left', async () => {
  let release!: () => void;
  await renderApp([income(10000, '2026-09-10'), expense(5000, '2026-10-02')], (db) => {
    ({ release } = slowMonth(db, '2026-09-01'));
  });

  await goPrevious();
  expect(header('September 2026')).toBeTruthy();
  expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);

  await goNext();
  expect(screen.getByLabelText(`Expenses, ${eur('50,00')}`)).toBeTruthy();

  await act(async () => release());
  expect(header('October 2026')).toBeTruthy();
  expect(screen.getByLabelText(`Expenses, ${eur('50,00')}`)).toBeTruthy();
  expect(screen.queryByLabelText(`Income, ${eur('100,00')}`)).toBeNull();
});

it('a month change clears the summary banner', async () => {
  await renderApp([]);
  act(() => notice.current!.show('open_failed'));
  expect(screen.getByText("Couldn't open this transaction.")).toBeTruthy();

  await goPrevious();
  expect(screen.queryByText("Couldn't open this transaction.")).toBeNull();
});

describe('back in the foreground in a new month', () => {
  it('moves a view of the old current month to the new one', async () => {
    mockClock.today = '2026-10-31';
    await renderApp([]);
    await comeBackToForeground('2026-11-01');
    await flush();

    expect(header('November 2026')).toBeTruthy();
    expect(nextButton()).toBeNull();
  });

  it('leaves a past month where it is', async () => {
    mockClock.today = '2026-10-31';
    await renderApp([]);
    await goPrevious();
    await comeBackToForeground('2026-11-01');
    await flush();

    expect(header('September 2026')).toBeTruthy();
    expect(nextButton()!.props.accessibilityLabel).toBe('Next month, October 2026');
  });
});

describe('motion under reduce motion (design.md, Motion; Jest runs with it on)', () => {
  it('shows the new month without sliding it in', async () => {
    await renderApp([expense(1000, '2026-10-02'), expense(2000, '2026-09-03')]);
    await goPrevious();
    expect(header('September 2026')).toBeTruthy();
    // Content that animates is wrapped in an Animated.View with this testID; nothing is.
    expect(screen.queryAllByTestId('appearing')).toHaveLength(0);
    expect(screen.getByLabelText('Balance, minus 20,00 €')).toBeTruthy();
  });
});
