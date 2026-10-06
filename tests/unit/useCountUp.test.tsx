import { act, render, renderHook, screen } from '@testing-library/react-native';

import { useCountUp } from '@/hooks/useCountUp';
import { easeOutFn } from '@/ui/motion';
import { Totals } from '@/ui/Totals';

jest.mock('expo-font', () => ({ isLoaded: () => true }));
// Suites run with reduce motion on (tests/setup/motion.ts); these count.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));

const OPTIONS = { animate: true, duration: 520, easing: easeOutFn };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function countFrom(initial: number | null, options = OPTIONS) {
  return renderHook(({ target }: { target: number | null }) => useCountUp(target, options), {
    initialProps: { target: initial },
  });
}

describe('useCountUp (design.md, Motion, "Counting amounts")', () => {
  it('shows the first value right away', () => {
    const { result } = countFrom(12345);
    expect(result.current).toBe(12345);
  });

  it('counts to the new value in whole cents and ends exactly on it', () => {
    const { result, rerender } = countFrom(0);
    rerender({ target: 15099 });
    const seen: number[] = [];
    for (let ms = 0; ms < 600; ms += 50) {
      act(() => jest.advanceTimersByTime(50));
      seen.push(result.current!);
    }
    expect(seen.every(Number.isInteger)).toBe(true);
    // It moves through values in between, never past the target.
    expect(seen.some((v) => v > 0 && v < 15099)).toBe(true);
    expect(Math.max(...seen)).toBe(15099);
    expect(result.current).toBe(15099);
  });

  it('counts down through negative values', () => {
    const { result, rerender } = countFrom(1000);
    rerender({ target: -15000 });
    act(() => jest.advanceTimersByTime(600));
    expect(result.current).toBe(-15000);
  });

  it('jumps without animation (reduce motion)', () => {
    const { result, rerender } = countFrom(0, { ...OPTIONS, animate: false });
    rerender({ target: 15099 });
    expect(result.current).toBe(15099);
  });

  it('keeps the last value while there is nothing to show, and counts from it', () => {
    const { result, rerender } = countFrom(5000);
    rerender({ target: null });
    expect(result.current).toBeNull();
    rerender({ target: 9000 });
    // The first frame still shows the previous month's amount.
    expect(result.current).toBe(5000);
    act(() => jest.advanceTimersByTime(600));
    expect(result.current).toBe(9000);
  });
});

describe('balance card while counting (FR-015)', () => {
  const card = (balanceCents: number) => (
    <Totals
      tag="es-ES"
      header={() => null}
      content={{ kind: 'values', incomeCents: 0, expenseCents: -balanceCents, balanceCents }}
    />
  );

  it('labels the final amount for the screen reader right after a change', () => {
    render(card(0));
    screen.rerender(card(-15000));
    act(() => jest.advanceTimersByTime(100));
    expect(screen.getByLabelText('Balance, minus 150,00 €')).toBeTruthy();
    // The drawn amount is still on its way.
    expect(screen.queryByText('-150,00 €')).toBeNull();

    act(() => jest.advanceTimersByTime(500));
    expect(screen.getByText('-150,00 €')).toBeTruthy();
  });
});
