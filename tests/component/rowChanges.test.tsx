import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import type { SqlParam } from '@/data/sqlDatabase';
import { createTransactionRepository, type TransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider, useSummaryNotice, type SummaryNoticeValue } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

// T065 (design.md, Motion, "Saved" and "Deleted"): only the row a save or delete changed animates.
const mockReduceMotion = jest.fn(() => false);
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion(),
}));
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));
// `focus()` replays the summary's focus effect, as when a form closes over it.
const mockFocus: { current: (() => void) | null } = { current: null };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => {
      mockFocus.current = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});

const SummaryScreen = require('@/app/index').default;

const expense = (amountCents: number, date: string): TransactionInput => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note: null,
});

const notice: { current: SummaryNoticeValue | null } = { current: null };
function Harness() {
  notice.current = useSummaryNotice();
  return <SummaryScreen />;
}

let db: TestDatabase;
let repository: TransactionRepository;
let failReads = false;

async function renderSummary(rows: TransactionInput[]) {
  db = openTestDatabase();
  await openAndMigrate(db);
  repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  const getAllAsync = db.getAllAsync.bind(db);
  db.getAllAsync = async <T,>(sql: string, ...params: SqlParam[]): Promise<T[]> => {
    if (failReads) throw new Error('read failed');
    return getAllAsync<T>(sql, ...params);
  };
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <Harness />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await flush();
}

const flush = () => act(async () => {});
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
/** What a form does after a successful save or delete, then the summary's reload on focus. */
async function changeAndReload(change: Parameters<SummaryNoticeValue['recordChange']>[0]) {
  act(() => notice.current!.recordChange(change));
  await act(async () => mockFocus.current!());
  await flush();
}
const changed = () => screen.queryAllByTestId(/^row-/);

ignoreListBatchingWarnings();

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion.mockReturnValue(false);
  failReads = false;
});
afterEach(() => jest.useRealTimers());

const MONTH = [expense(100, '2026-10-01'), expense(200, '2026-10-02'), expense(300, '2026-10-03')];

it('grows in only the created row', async () => {
  await renderSummary(MONTH);
  const created = await repository.create(expense(400, '2026-10-04'), 99);
  await changeAndReload({ kind: 'created', id: created.id });

  expect(changed()).toHaveLength(1);
  expect(changed()[0].props.testID).toBe('row-created');
  const style = getAnimatedStyle(changed()[0]) as { opacity: number; height: number };
  expect(style.opacity).toBe(0);
  expect(style.height).toBe(0);
});

it('flashes only the edited row, once the reload shows its new values', async () => {
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.update(row.id, expense(999, row.date));
  act(() => notice.current!.recordChange({ kind: 'updated', id: row.id }));
  // Nothing before the reload: the old values are still on screen.
  expect(changed()).toHaveLength(0);

  await act(async () => mockFocus.current!());
  await flush();
  expect(changed().map((n) => n.props.testID)).toEqual(['row-updated']);
  expect(screen.getByLabelText(/^Expense, Food, 9,99/)).toBeTruthy();
});

it('slides a deleted row out, then drops it', async () => {
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.remove(row.id);
  await changeAndReload({ kind: 'deleted', id: row.id });

  expect(changed().map((n) => n.props.testID)).toEqual(['row-deleted']);
  // It cannot be opened on its way out, and the totals already exclude it.
  expect(changed()[0].props.pointerEvents).toBe('none');
  expect(screen.getByLabelText('Expenses, 3,00 €')).toBeTruthy();

  wait(300);
  expect(changed()).toHaveLength(0);
  expect(screen.getAllByLabelText(/^Expense, Food/)).toHaveLength(2);
});

it('under reduce motion fades without moving or growing', async () => {
  mockReduceMotion.mockReturnValue(true);
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.remove(row.id);
  await changeAndReload({ kind: 'deleted', id: row.id });

  const style = getAnimatedStyle(changed()[0]) as {
    height: number | string;
    transform: [{ translateX: number }, { scale: number }];
  };
  expect(style.height).toBe('auto');
  expect(style.transform).toEqual([{ translateX: 0 }, { scale: 1 }]);
  // Gone within the 200 ms fade.
  wait(210);
  expect(changed()).toHaveLength(0);
});

it('shows the error and animates nothing when the reload fails, even after a later retry', async () => {
  await renderSummary(MONTH);
  const created = await repository.create(expense(400, '2026-10-04'), 99);
  failReads = true;
  await changeAndReload({ kind: 'created', id: created.id });
  expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
  expect(changed()).toHaveLength(0);

  failReads = false;
  await act(async () => mockFocus.current!());
  await flush();
  expect(screen.getAllByLabelText(/^Expense, Food/).length).toBeGreaterThan(0);
  expect(changed()).toHaveLength(0);
});

it('mounts a 1,000-row month without per-row animations', async () => {
  const rows = Array.from({ length: 1000 }, (_, i) =>
    expense(100 + i, `2026-10-${String((i % 15) + 1).padStart(2, '0')}`),
  );
  await renderSummary(rows);
  wait(2000);
  expect(changed()).toHaveLength(0);
  // Only the first screen of rows ever had an entrance wrapper animating.
  expect(screen.queryAllByTestId('appearing').length).toBeLessThanOrEqual(11);
});
