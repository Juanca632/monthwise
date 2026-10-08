import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DatabaseContextValue } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import type { Transaction, TransactionRepository } from '@/data/transactionRepository';
import type { LedgerRow } from '@/domain/ledger';
import type { YearMonth } from '@/domain/month';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { logTiming } from '@/lib/devLog';
import { reportError } from '@/lib/reportError';
import { SelectedMonthProvider, useSelectedMonth } from '@/state/SelectedMonthContext';

// Mutable so a test can move to the next day, as a foreground after midnight does.
let mockToday = '2026-10-15';
jest.mock('@/hooks/useToday', () => ({
  useToday: () => mockToday,
  getToday: () => mockToday,
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('@/lib/reportError', () => ({ reportError: jest.fn() }));

let mockDb: DatabaseContextValue;
jest.mock('@/data/DatabaseProvider', () => ({ useDatabase: () => mockDb }));

// The real hook needs a navigator. This one runs the effect on mount and when the callback
// changes, like a focused screen, and `focus()` replays it as a new focus event.
const mockFocus: { current: (() => void) | null } = { current: null };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => void) => {
      mockFocus.current = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});
const focus = () => act(() => mockFocus.current!());

type Deferred = { resolve(rows: Transaction[]): void; reject(e: unknown): void };

type RangeDeferred = { resolve(rows: LedgerRow[]): void; reject(e: unknown): void };

/**
 * A repository whose listByMonth calls wait until the test settles them, in any order. The
 * previous month's read (listRange) answers `[]` at once unless `holdRange` is set; then its calls
 * wait in `rangeCalls` too.
 */
function controlledRepository({ holdRange = false } = {}) {
  const calls: { month: YearMonth; deferred: Deferred }[] = [];
  const rangeCalls: { from: YearMonth; to: YearMonth; deferred: RangeDeferred }[] = [];
  const repository = {
    listByMonth: jest.fn(
      (month: YearMonth) =>
        new Promise<Transaction[]>((resolve, reject) => {
          calls.push({ month, deferred: { resolve, reject } });
        }),
    ),
    listRange: jest.fn((from: YearMonth, to: YearMonth) =>
      holdRange
        ? new Promise<LedgerRow[]>((resolve, reject) => {
            rangeCalls.push({ from, to, deferred: { resolve, reject } });
          })
        : Promise.resolve([]),
    ),
  } as unknown as TransactionRepository;
  return { repository, calls, rangeCalls };
}

const ledger = (date: string, amountCents: number): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});

const row = (id: number, date: string, amountCents: number): Transaction => ({
  id,
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note: null,
  createdAt: id,
});

function dbValue(over: Partial<DatabaseContextValue>): DatabaseContextValue {
  return {
    status: 'ready',
    repository: null,
    retry: jest.fn(),
    whenReady: jest.fn(),
    ...over,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SelectedMonthProvider>{children}</SelectedMonthProvider>
);

function renderSummary() {
  return renderHook(() => ({ summary: useMonthSummary(), month: useSelectedMonth() }), {
    wrapper,
  });
}

/** Settles a query and lets React apply the result. */
const settle = (fn: () => void) => act(async () => fn());

beforeEach(() => {
  mockToday = '2026-10-15';
  jest.mocked(logTiming).mockClear();
  jest.mocked(reportError).mockClear();
});

it('stays loading while the database opens, then loads the current month', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ status: 'loading' });
  const { result, rerender } = renderSummary();
  expect(result.current.summary.status).toBe('loading');

  mockDb = dbValue({ status: 'ready', repository });
  rerender({});
  expect(calls.map((c) => c.month)).toEqual([{ year: 2026, month: 10 }]);
  expect(result.current.summary.status).toBe('loading');

  await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 1250)]));
  expect(result.current.summary.status).toBe('ready');
  expect(result.current.summary.rows).toHaveLength(1);
  expect(result.current.summary.summary.expenseCents).toBe(1250);
  // This is the file's first query, so it logs the cold-start timing.
  expect(jest.mocked(logTiming).mock.calls).toEqual([['first-query', expect.any(Number)]]);
});

it('keeps the data on screen during a same-month reload (no loading state)', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();
  await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 1250)]));

  focus();
  expect(calls).toHaveLength(2);
  expect(result.current.summary.status).toBe('ready');
  expect(result.current.summary.rows).toHaveLength(1);

  await settle(() =>
    calls[1].deferred.resolve([row(2, '2026-10-03', 500), row(1, '2026-10-02', 1250)]),
  );
  expect(result.current.summary.rows).toHaveLength(2);
  expect(result.current.summary.summary.expenseCents).toBe(1750);
  // first-query is logged once per app run (module-level), not on every load.
  expect(logTiming).not.toHaveBeenCalled();
});

it('keeps the same rows object when a focus reload brings back identical rows', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();
  await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 1250)]));
  const before = result.current.summary.rows;

  focus();
  await settle(() => calls[1].deferred.resolve([row(1, '2026-10-02', 1250)]));
  expect(result.current.summary.rows).toBe(before);

  focus();
  await settle(() => calls[2].deferred.resolve([row(1, '2026-10-02', 900)]));
  expect(result.current.summary.rows).not.toBe(before);
  expect(result.current.summary.summary.expenseCents).toBe(900);
});

it('discards a slow reply for a month that is no longer selected', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();

  act(() => result.current.month.goPrevious());
  expect(calls.map((c) => c.month)).toEqual([
    { year: 2026, month: 10 },
    { year: 2026, month: 9 },
  ]);
  expect(result.current.summary.status).toBe('loading');

  await settle(() => calls[1].deferred.resolve([row(9, '2026-09-30', 900)]));
  await settle(() => calls[0].deferred.resolve([row(10, '2026-10-01', 1000)]));

  expect(result.current.summary.status).toBe('ready');
  expect(result.current.summary.rows.map((r) => r.id)).toEqual([9]);
});

it('keeps the newest of two overlapping queries for the same month', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();
  focus();

  await settle(() => calls[1].deferred.resolve([row(2, '2026-10-03', 200)]));
  await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 100)]));

  expect(result.current.summary.rows.map((r) => r.id)).toEqual([2]);
});

it('shows the error state when the query fails, and retry loads again', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();

  await settle(() => calls[0].deferred.reject(new StorageError('list')));
  expect(result.current.summary.status).toBe('error');
  expect(reportError).toHaveBeenCalledWith('list');

  act(() => result.current.summary.retry());
  expect(result.current.summary.status).toBe('loading');
  expect(calls).toHaveLength(2);

  await settle(() => calls[1].deferred.resolve([]));
  expect(result.current.summary.status).toBe('ready');
});

it('shows the error state when a same-month reload fails', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderSummary();
  await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 1250)]));

  focus();
  await settle(() => calls[1].deferred.reject(new StorageError('list')));
  expect(result.current.summary.status).toBe('error');
  expect(result.current.summary.rows).toHaveLength(0);
});

it('maps a failed database open to error, and retry reopens the database', () => {
  mockDb = dbValue({ status: 'error' });
  const { result } = renderSummary();
  expect(result.current.summary.status).toBe('error');

  act(() => result.current.summary.retry());
  expect(mockDb.retry).toHaveBeenCalledTimes(1);
});

describe('pace (002, research R3)', () => {
  const SEP = { year: 2026, month: 9 };

  it('reads the month and the previous month in one load, and computes the pace from both', async () => {
    const { repository, calls, rangeCalls } = controlledRepository({ holdRange: true });
    mockDb = dbValue({ repository });
    const { result } = renderSummary();

    expect(calls.map((c) => c.month)).toEqual([{ year: 2026, month: 10 }]);
    expect(rangeCalls.map((c) => [c.from, c.to])).toEqual([[SEP, SEP]]);

    await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 3_000)]));
    // Half the data never shows: still loading until the previous month arrives.
    expect(result.current.summary.status).toBe('loading');
    expect(result.current.summary.pace).toBeNull();

    await settle(() => rangeCalls[0].deferred.resolve([ledger('2026-09-10', 1_000)]));
    expect(result.current.summary.status).toBe('ready');
    expect(result.current.summary.pace?.sentence).toEqual({
      kind: 'more',
      differenceCents: 2_000,
      comparisonDay: 15,
      previousMonth: SEP,
    });
  });

  it('shows the error state when the previous month read fails', async () => {
    const { repository, calls, rangeCalls } = controlledRepository({ holdRange: true });
    mockDb = dbValue({ repository });
    const { result } = renderSummary();

    await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 3_000)]));
    await settle(() => rangeCalls[0].deferred.reject(new StorageError('list')));
    expect(result.current.summary.status).toBe('error');
    expect(result.current.summary.pace).toBeNull();
    expect(result.current.summary.rows).toHaveLength(0);
    expect(reportError).toHaveBeenCalledWith('list');
  });

  it('keeps only the newest result when month changes overlap', async () => {
    const { repository, calls, rangeCalls } = controlledRepository({ holdRange: true });
    mockDb = dbValue({ repository });
    const { result } = renderSummary();

    act(() => result.current.month.setSelected(SEP));
    expect(rangeCalls.map((c) => c.from)).toEqual([SEP, { year: 2026, month: 8 }]);

    // September's load finishes first; October's, now stale, lands last.
    await settle(() => calls[1].deferred.resolve([row(9, '2026-09-30', 900)]));
    await settle(() => rangeCalls[1].deferred.resolve([ledger('2026-08-31', 400)]));
    await settle(() => calls[0].deferred.resolve([row(10, '2026-10-01', 1_000)]));
    await settle(() => rangeCalls[0].deferred.resolve([ledger('2026-09-01', 99_999)]));

    expect(result.current.summary.rows.map((r) => r.id)).toEqual([9]);
    expect(result.current.summary.pace?.sentence).toEqual({
      kind: 'more',
      differenceCents: 500,
      comparisonDay: null,
      previousMonth: { year: 2026, month: 8 },
    });
  });

  it('a same-month reload with a changed previous month updates the pace', async () => {
    const { repository, calls, rangeCalls } = controlledRepository({ holdRange: true });
    mockDb = dbValue({ repository });
    const { result } = renderSummary();
    await settle(() => calls[0].deferred.resolve([row(1, '2026-10-02', 3_000)]));
    await settle(() => rangeCalls[0].deferred.resolve([ledger('2026-09-10', 1_000)]));
    const before = result.current.summary.rows;

    focus();
    await settle(() => calls[1].deferred.resolve([row(1, '2026-10-02', 3_000)]));
    await settle(() => rangeCalls[1].deferred.resolve([ledger('2026-09-10', 3_000)]));
    // The month's own rows did not change, but the previous month did, so the state is new.
    expect(result.current.summary.rows).not.toBe(before);
    expect(result.current.summary.pace?.sentence).toMatchObject({ kind: 'same' });
  });

  it('January 2000 makes one read: nothing can exist before it', async () => {
    const { repository, calls } = controlledRepository();
    mockDb = dbValue({ repository });
    const { result } = renderSummary();
    await settle(() => calls[0].deferred.resolve([]));
    jest.mocked(repository.listRange).mockClear();

    act(() => result.current.month.setSelected({ year: 2000, month: 1 }));
    expect(calls.at(-1)?.month).toEqual({ year: 2000, month: 1 });
    expect(repository.listRange).not.toHaveBeenCalled();

    await settle(() => calls.at(-1)!.deferred.resolve([row(1, '2000-01-10', 300)]));
    expect(result.current.summary.pace?.sentence).toEqual({
      kind: 'noPreviousData',
      previousMonth: { year: 1999, month: 12 },
      isCurrent: false,
    });
  });

  it('a new today recomputes the pace without a new read', async () => {
    const { repository, calls } = controlledRepository();
    mockDb = dbValue({ repository });
    const { result, rerender } = renderSummary();
    await settle(() => calls[0].deferred.resolve([row(1, '2026-10-16', 500)]));
    expect(result.current.summary.pace?.sentence).toEqual({ kind: 'noSpending' });

    mockToday = '2026-10-16';
    rerender({});
    expect(calls).toHaveLength(1);
    expect(result.current.summary.pace?.comparisonDay).toBe(16);
    expect(result.current.summary.pace?.sentence).toEqual({
      kind: 'noPreviousData',
      previousMonth: SEP,
      isCurrent: true,
    });
  });
});
