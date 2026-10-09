import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DatabaseContextValue } from '@/data/DatabaseProvider';
import type { TransactionRepository } from '@/data/transactionRepository';
import type { LedgerRow } from '@/domain/ledger';
import type { YearMonth } from '@/domain/month';
import { computePace } from '@/domain/pace';
import { useInsights } from '@/hooks/useInsights';
import { reportError } from '@/lib/reportError';
import { dropPace, handOffPace, takePace } from '@/state/handedPace';
import { SelectedMonthProvider, useSelectedMonth } from '@/state/SelectedMonthContext';

// Mutable so a test can move to another day, as a foreground after midnight does.
let mockToday = '2026-10-15';
jest.mock('@/hooks/useToday', () => ({
  useToday: () => mockToday,
  getToday: () => mockToday,
}));
jest.mock('@/lib/reportError', () => ({ reportError: jest.fn() }));

let mockDb: DatabaseContextValue;
jest.mock('@/data/DatabaseProvider', () => ({ useDatabase: () => mockDb }));

// A navigator whose `transitionEnd` the test fires, and focus effects as in useMonthSummary's
// suite: run on mount and when the callback changes; `focus()` replays the latest one.
const mockFocus: { current: (() => void) | null } = { current: null };
const mockTransitionEnd: { listeners: (() => void)[] } = { listeners: [] };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  const navigation = {
    addListener: (_event: string, listener: () => void) => {
      mockTransitionEnd.listeners.push(listener);
      return () => {
        mockTransitionEnd.listeners = mockTransitionEnd.listeners.filter((l) => l !== listener);
      };
    },
  };
  return {
    useNavigation: () => navigation,
    useFocusEffect: (effect: () => void) => {
      mockFocus.current = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});
const focus = () => act(() => mockFocus.current!());
const endTransition = () => act(() => mockTransitionEnd.listeners.forEach((l) => l()));

type RangeCall = { from: YearMonth; to: YearMonth; resolve(rows: LedgerRow[]): void; reject(e: unknown): void };

/** A repository whose listRange calls wait until the test settles them, in any order. */
function controlledRepository() {
  const calls: RangeCall[] = [];
  const repository = {
    listRange: jest.fn(
      (from: YearMonth, to: YearMonth) =>
        new Promise<LedgerRow[]>((resolve, reject) => calls.push({ from, to, resolve, reject })),
    ),
  } as unknown as TransactionRepository;
  return { repository, calls };
}

const expense = (date: string, amountCents: number): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});

function dbValue(over: Partial<DatabaseContextValue>): DatabaseContextValue {
  return { status: 'ready', repository: null, retry: jest.fn(), whenReady: jest.fn(), ...over };
}

const wrapper = ({ children }: { children: ReactNode }) => <SelectedMonthProvider>{children}</SelectedMonthProvider>;
const renderInsights = () =>
  renderHook(() => ({ insights: useInsights(), month: useSelectedMonth() }), { wrapper });

const settle = (fn: () => void) => act(async () => fn());

const OCT = { year: 2026, month: 10 };
const SEP = { year: 2026, month: 9 };

beforeEach(() => {
  mockToday = '2026-10-15';
  mockTransitionEnd.listeners = [];
  jest.mocked(reportError).mockClear();
  dropPace();
});

it('reads nothing before the push transition ends, then the six months up to the selected one', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  expect(calls).toHaveLength(0);
  expect(result.current.insights.status).toBe('loading');

  await endTransition();
  expect(calls).toHaveLength(1);
  expect(calls[0].from).toEqual({ year: 2026, month: 5 });
  expect(calls[0].to).toEqual(OCT);

  await settle(() => calls[0].resolve([expense('2026-10-02', 7_000), expense('2026-09-04', 10_000)]));
  expect(result.current.insights.status).toBe('ready');
  expect(result.current.insights.pace?.sentence).toMatchObject({ kind: 'less', differenceCents: 3_000 });
});

it('clamps the first month to January 2000', async () => {
  mockToday = '2000-03-10';
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  renderInsights();
  await endTransition();
  expect(calls[0].from).toEqual({ year: 2000, month: 1 });
});

it('shows the handed pace while loading, only for its own month', async () => {
  const handed = computePace(OCT, [expense('2026-10-02', 7_000)], [], '2026-10-15');
  handOffPace(handed, 0);
  const { repository } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  expect(result.current.insights.status).toBe('loading');
  expect(result.current.insights.pace).toBe(handed);

  act(() => result.current.month.setSelected(SEP));
  expect(result.current.insights.pace).toBeNull();
  expect(takePace(OCT)).toBeNull();
});

it('keeps only the newest read when an older, slower one answers last', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  await endTransition();
  act(() => result.current.month.setSelected(SEP));
  expect(calls).toHaveLength(2);

  await settle(() => calls[1].resolve([expense('2026-09-04', 1_000)]));
  await settle(() => calls[0].resolve([expense('2026-10-02', 99_000)]));
  expect(result.current.insights.status).toBe('ready');
  expect(result.current.insights.pace?.selected.month).toEqual(SEP);
  expect(result.current.insights.rows).toEqual([expense('2026-09-04', 1_000)]);
});

it('keeps the data on screen during a same-month focus reload', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  await endTransition();
  await settle(() => calls[0].resolve([expense('2026-10-02', 7_000)]));

  focus();
  expect(calls).toHaveLength(2);
  expect(result.current.insights.status).toBe('ready');
  await settle(() => calls[1].resolve([expense('2026-10-02', 7_000), expense('2026-10-03', 1_000)]));
  expect(result.current.insights.rows).toHaveLength(2);
});

it('shows the error state and reports only the code when the read fails', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  await endTransition();
  await settle(() => calls[0].reject(new Error('disk I/O error: October food 70,00')));

  expect(result.current.insights.status).toBe('error');
  expect(result.current.insights.pace).toBeNull();
  expect(reportError).toHaveBeenCalledTimes(1);
  expect(reportError).toHaveBeenCalledWith('list');
});

it('retry shows loading, then the data', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result } = renderInsights();
  await endTransition();
  await settle(() => calls[0].reject(new Error('busy')));

  act(() => result.current.insights.retry());
  expect(result.current.insights.status).toBe('loading');
  await settle(() => calls[1].resolve([]));
  expect(result.current.insights.status).toBe('ready');
});

it('retry reopens a database that failed to open', async () => {
  const reopen = jest.fn();
  mockDb = dbValue({ status: 'error', retry: reopen });
  const { result } = renderInsights();
  expect(result.current.insights.status).toBe('error');
  act(() => result.current.insights.retry());
  expect(reopen).toHaveBeenCalledTimes(1);
});

it('moves the comparison day with a new today on the next focus', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const { result, rerender } = renderInsights();
  await endTransition();
  await settle(() => calls[0].resolve([]));
  expect(result.current.insights.pace?.comparisonDay).toBe(15);

  mockToday = '2026-10-16';
  rerender({});
  focus();
  await settle(() => calls[calls.length - 1].resolve([]));
  expect(result.current.insights.pace?.comparisonDay).toBe(16);
});

it('follows the current month into the next one on a rollover, while a past month stays (FR-031)', async () => {
  const { repository, calls } = controlledRepository();
  mockDb = dbValue({ repository });
  const current = renderInsights();
  await endTransition();
  await settle(() => calls[0].resolve([]));

  mockToday = '2026-11-01';
  current.rerender({});
  focus();
  expect(current.result.current.month.selected).toEqual({ year: 2026, month: 11 });
  expect(calls[calls.length - 1].to).toEqual({ year: 2026, month: 11 });
  current.unmount();

  mockToday = '2026-10-15';
  const past = renderInsights();
  act(() => past.result.current.month.setSelected(SEP));
  mockToday = '2026-11-01';
  past.rerender({});
  expect(past.result.current.month.selected).toEqual(SEP);
});
