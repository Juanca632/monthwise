import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { useConfirmChange } from '@/hooks/useConfirmChange';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';
import { ToastProvider } from '@/state/ToastContext';
import { Toast } from '@/ui/Toast';

// T070 (design.md, Toast; FR-032). A toast follows only a confirmed change: the route suites
// check that failed saves and deletes, and a delete of a row already gone, never confirm one
// (no success haptic, which comes from the same useConfirmChange call).
const mockReduceMotion = jest.fn(() => false);
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion(),
}));
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-10-15', getToday: () => '2026-10-15' }));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ haptics: { saved: jest.fn(), deleted: jest.fn() } }));
const INSETS = { top: 24, bottom: 16, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => INSETS }));

const confirm: { current: ReturnType<typeof useConfirmChange> | null } = { current: null };
function Harness() {
  confirm.current = useConfirmChange();
  return null;
}

function renderApp() {
  render(
    <SelectedMonthProvider>
      <SummaryNoticeProvider>
        <ToastProvider>
          <Harness />
          <Toast />
        </ToastProvider>
      </SummaryNoticeProvider>
    </SelectedMonthProvider>,
  );
}

const toast = () => screen.queryByTestId('toast', { includeHiddenElements: true });
const motion = () =>
  getAnimatedStyle(toast()!) as { opacity: number; transform: [{ translateY: number }] };
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

let announce: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion.mockReturnValue(false);
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  announce.mockRestore();
});

it.each([
  [{ kind: 'created', id: 1 }, 'Saved'],
  [{ kind: 'updated', id: 1 }, 'Saved'],
  [{ kind: 'deleted', id: 1 }, 'Deleted'],
] as const)('%o shows "%s" and announces it once', (change, message) => {
  renderApp();
  expect(toast()).toBeNull();
  act(() => confirm.current!(change));
  expect(screen.getByText(message, { includeHiddenElements: true })).toBeTruthy();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(message);
});

it('sits 12 dp above Add, ignores touches and is not a focus stop', () => {
  renderApp();
  act(() => confirm.current!({ kind: 'created', id: 1 }));
  const style = StyleSheet.flatten(toast()!.props.style);
  expect(style.bottom).toBe(28 + INSETS.bottom + 56 + 12);
  expect(toast()!.props.pointerEvents).toBe('none');
  expect(toast()!.props.importantForAccessibility).toBe('no-hide-descendants');
});

it('rises 16 dp while fading in, then fades out and is gone after about 1.8 s', () => {
  renderApp();
  act(() => confirm.current!({ kind: 'created', id: 1 }));
  expect(motion().transform[0].translateY).toBe(16);
  wait(300);
  expect(motion()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  wait(1550);
  expect(toast()).toBeNull();
});

it('fades without moving under reduce motion', () => {
  mockReduceMotion.mockReturnValue(true);
  renderApp();
  act(() => confirm.current!({ kind: 'deleted', id: 1 }));
  expect(motion().transform[0].translateY).toBe(0);
  wait(100);
  const opacity = motion().opacity;
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  wait(1800);
  expect(toast()).toBeNull();
});
