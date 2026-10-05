import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DatabaseContextValue } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import type { Transaction, TransactionRepository } from '@/data/transactionRepository';
import type { YearMonth } from '@/domain/month';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { logTiming } from '@/lib/devLog';
import { reportError } from '@/lib/reportError';
import { SelectedMonthProvider, useSelectedMonth } from '@/state/SelectedMonthContext';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
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

/** A repository whose listByMonth calls wait until the test settles them, in any order. */
function controlledRepository() {
  const calls: { month: YearMonth; deferred: Deferred }[] = [];
  const repository = {
    listByMonth: jest.fn(
      (month: YearMonth) =>
        new Promise<Transaction[]>((resolve, reject) => {
          calls.push({ month, deferred: { resolve, reject } });
        }),
    ),
  } as unknown as TransactionRepository;
  return { repository, calls };
}

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
