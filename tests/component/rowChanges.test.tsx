import { act, render, screen } from '@testing-library/react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import type { SqlParam } from '@/data/sqlDatabase';
import { createTransactionRepository, type TransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
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
const month: { current: SelectedMonthValue | null } = { current: null };
function Harness() {
  notice.current = useSummaryNotice();
  month.current = useSelectedMonth();
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

it('shows a created row with no motion of its own: only the rows around it move', async () => {
  await renderSummary(MONTH);
  const created = await repository.create(expense(400, '2026-10-04'), 99);
  await changeAndReload({ kind: 'created', id: created.id });

  expect(changed()).toHaveLength(0);
  // The summary previews the 3 most recent (FR-017): the created row and two of the others.
  expect(screen.getAllByLabelText(/^Expense, Food/)).toHaveLength(3);
});

it('waits for focus to reload, so nothing competes with the sheet sliding down', async () => {
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.update(row.id, expense(999, row.date));
  act(() => notice.current!.recordChange({ kind: 'updated', id: row.id }));
  await flush();
  expect(changed()).toHaveLength(0);

  await act(async () => mockFocus.current!());
  await flush();
  expect(changed().map((n) => n.props.testID)).toEqual(['row-updated']);
});

it('flashes a row edited into another month once that month has loaded (FR-020)', async () => {
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.update(row.id, expense(999, '2026-09-20'));
  // What the edit form does: record the change, then show the row's month.
  act(() => {
    notice.current!.recordChange({ kind: 'updated', id: row.id });
    month.current!.setSelected({ year: 2026, month: 9 });
  });
  await flush();
  expect(changed().map((n) => n.props.testID)).toEqual(['row-updated']);
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

it('removes a deleted row with no motion of its own once the reload drops it', async () => {
  await renderSummary(MONTH);
  const [row] = await repository.listByMonth({ year: 2026, month: 10 });
  await repository.remove(row.id);
  await changeAndReload({ kind: 'deleted', id: row.id });

  expect(changed()).toHaveLength(0);
  expect(screen.getAllByLabelText(/^Expense, Food/)).toHaveLength(2);
  expect(screen.getByLabelText('Expenses, 3,00 €')).toBeTruthy();
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
