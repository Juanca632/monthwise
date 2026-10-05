import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SelectedMonthProvider, useSelectedMonth } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider, useSummaryNotice } from '@/state/SummaryNoticeContext';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 5, 12));
});

afterEach(() => jest.useRealTimers());

const wrapper = ({ children }: { children: ReactNode }) => (
  <SelectedMonthProvider>
    <SummaryNoticeProvider>{children}</SummaryNoticeProvider>
  </SelectedMonthProvider>
);

const renderBoth = () =>
  renderHook(() => ({ month: useSelectedMonth(), notice: useSummaryNotice() }), { wrapper });

it('starts with no notice, shows one and dismisses it', () => {
  const { result } = renderBoth();
  expect(result.current.notice.notice).toBeNull();

  act(() => result.current.notice.show('open_failed'));
  expect(result.current.notice.notice).toBe('open_failed');

  act(() => result.current.notice.dismiss());
  expect(result.current.notice.notice).toBeNull();
});

it('clears the notice when setSelected changes the month', () => {
  const { result } = renderBoth();
  act(() => result.current.notice.show('open_failed'));

  act(() => result.current.month.setSelected({ year: 2026, month: 8 }));
  expect(result.current.notice.notice).toBeNull();
});

it('clears the notice on month navigation', () => {
  const { result } = renderBoth();
  act(() => result.current.notice.show('open_failed'));

  act(() => result.current.month.goPrevious());
  expect(result.current.notice.notice).toBeNull();
});

it('keeps the notice when setSelected receives the same month as a new object', () => {
  const { result } = renderBoth();
  act(() => result.current.notice.show('open_failed'));

  act(() => result.current.month.setSelected({ year: 2026, month: 10 }));
  expect(result.current.notice.notice).toBe('open_failed');
});
