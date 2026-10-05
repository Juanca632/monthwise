import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getToday, useToday } from '@/hooks/useToday';
import { SelectedMonthProvider, useSelectedMonth } from '@/state/SelectedMonthContext';

let appStateListeners: ((state: AppStateStatus) => void)[];

beforeEach(() => {
  jest.useFakeTimers();
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Local time on purpose: the app works with the phone's calendar day. */
const setClock = (y: number, m: number, d: number, h = 12) =>
  jest.setSystemTime(new Date(y, m - 1, d, h, 0, 0));

const emit = (state: AppStateStatus) => act(() => appStateListeners.forEach((l) => l(state)));

const wrapper = ({ children }: { children: ReactNode }) => (
  <SelectedMonthProvider>{children}</SelectedMonthProvider>
);

describe('getToday / useToday', () => {
  it('uses the local calendar day', () => {
    setClock(2026, 10, 5, 23);
    expect(getToday()).toBe('2026-10-05');
  });

  it('recomputes today when the app becomes active', () => {
    setClock(2026, 10, 5, 23);
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-05');

    setClock(2026, 10, 6, 0);
    expect(result.current).toBe('2026-10-05');
    emit('background');
    expect(result.current).toBe('2026-10-05');
    emit('active');
    expect(result.current).toBe('2026-10-06');
  });
});

describe('SelectedMonthContext', () => {
  it('starts on the current month (FR-014)', () => {
    setClock(2026, 10, 5);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });
    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.canGoPrevious).toBe(true);
  });

  it('moves back and forward, never past the current month', () => {
    setClock(2026, 1, 15);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });

    act(() => result.current.goNext());
    expect(result.current.selected).toEqual({ year: 2026, month: 1 });

    act(() => result.current.goPrevious());
    expect(result.current.selected).toEqual({ year: 2025, month: 12 });
    expect(result.current.canGoNext).toBe(true);

    act(() => result.current.goNext());
    expect(result.current.selected).toEqual({ year: 2026, month: 1 });
  });

  it('never goes before January 2000', () => {
    setClock(2026, 10, 5);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });
    act(() => result.current.setSelected({ year: 2000, month: 1 }));
    expect(result.current.canGoPrevious).toBe(false);

    act(() => result.current.goPrevious());
    expect(result.current.selected).toEqual({ year: 2000, month: 1 });
  });

  it('follows the new current month on foreground if it showed the old one', () => {
    setClock(2026, 9, 30, 23);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });
    expect(result.current.selected).toEqual({ year: 2026, month: 9 });

    setClock(2026, 10, 1, 0);
    emit('active');
    expect(result.current.today).toBe('2026-10-01');
    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
  });

  it('keeps a past month on foreground after a month change', () => {
    setClock(2026, 9, 30, 23);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });
    act(() => result.current.goPrevious());

    setClock(2026, 10, 1, 0);
    emit('active');
    expect(result.current.selected).toEqual({ year: 2026, month: 8 });
    expect(result.current.canGoNext).toBe(true);
  });

  it('stays put when the day changes but the month does not', () => {
    setClock(2026, 9, 14, 23);
    const { result } = renderHook(() => useSelectedMonth(), { wrapper });

    setClock(2026, 9, 15, 0);
    emit('active');
    expect(result.current.today).toBe('2026-09-15');
    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
  });
});
