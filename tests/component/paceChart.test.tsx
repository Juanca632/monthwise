import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { LedgerRow } from '@/domain/ledger';
import { computePace, type Pace } from '@/domain/pace';
import { PaceChart } from '@/ui/charts/PaceChart';
import type { ChartSelectionEvent } from '@/ui/charts/selection';
import { minTouch } from '@/ui/theme';

import { dragPaceChartVertically, touchPaceChart } from '../helpers/paceGesture';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
let mockScreenReader = false;
jest.mock('@/hooks/useScreenReader', () => ({ useScreenReader: () => mockScreenReader }));
let mockReduceMotion = true;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const OCT = { year: 2026, month: 10 };
const TODAY = '2026-10-12';
let nextId = 1;
const expense = (date: string, amountCents: number): LedgerRow =>
  ({ id: nextId++, type: 'expense', amountCents, date, category: 'food' }) as LedgerRow;

const twoLines = (): Pace =>
  computePace(
    OCT,
    [expense('2026-10-02', 7_000), expense('2026-10-08', 5_000)],
    [expense('2026-09-04', 10_000)],
    TODAY,
  );
const oneLine = (): Pace => computePace(OCT, [expense('2026-10-02', 7_000)], [], TODAY);

/** Day N's band center at the harness width (contracts/test-harness.md): 10 dp per day. */
const WIDTH = 310;
const dayX = (day: number) => (day - 0.5) * 10;

function renderFull(pace: Pace, selectedDay: number | null = null) {
  const events: ChartSelectionEvent[] = [];
  const view = render(
    <PaceChart variant="full" pace={pace} tag="es-ES" selectedDay={selectedDay} onEvent={(e) => events.push(e)} />,
  );
  fireEvent(screen.getByTestId('pace-chart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 180 } },
  });
  return { events, view };
}

const svgText = () => JSON.stringify(screen.toJSON());

beforeEach(() => {
  mockScreenReader = false;
  mockReduceMotion = true;
});

describe('PaceChart, compact', () => {
  it('draws two lines and names both months in the legend', () => {
    render(<PaceChart variant="compact" pace={twoLines()} />);
    fireEvent(screen.getByTestId('pace-chart-compact', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { width: WIDTH, height: 64 } },
    });
    expect(screen.getByText('October', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('September', { includeHiddenElements: true })).toBeTruthy();
    expect(svgText()).toContain('"strokeDasharray"');
  });

  it('draws one line and one legend item when the previous month has no data', () => {
    render(<PaceChart variant="compact" pace={oneLine()} />);
    expect(screen.getByText('October')).toBeTruthy();
    expect(screen.queryByText('September')).toBeNull();
  });

  it('has no day marks and no touch area', () => {
    render(<PaceChart variant="compact" pace={twoLines()} />);
    expect(screen.queryByText('15', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('pace-chart')).toBeNull();
  });
});

describe('PaceChart, full', () => {
  it('shows the legend and the day marks 1, 8, 15, 22 and 29', () => {
    renderFull(twoLines());
    expect(screen.getByText('October')).toBeTruthy();
    expect(screen.getByText('September')).toBeTruthy();
    for (const day of ['1', '8', '15', '22', '29']) {
      expect(screen.getByText(day, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('draws the previous line dashed and the selected line solid', () => {
    renderFull(twoLines());
    expect(svgText().match(/"strokeDasharray"/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it('has a touch area of the whole 180 dp chart, at least 48 dp tall', () => {
    renderFull(twoLines());
    const height = StyleSheet.flatten(screen.getByTestId('pace-chart').props.style).height;
    expect(height).toBe(180);
    expect(height).toBeGreaterThanOrEqual(minTouch);
  });

  it('renders no day elements with the screen reader off', () => {
    renderFull(twoLines());
    expect(screen.queryByRole('button', { name: 'Day 8' })).toBeNull();
  });

  it('renders 31 day elements with their values and selected state with the screen reader on', () => {
    mockScreenReader = true;
    const { events } = renderFull(twoLines(), 8);
    expect(screen.getAllByRole('button', { name: /^Day \d+$/ })).toHaveLength(31);
    const day8 = screen.getByRole('button', { name: 'Day 8' });
    // Intl separates the amount from the € with a no-break space.
    expect(day8.props.accessibilityValue.text.replace(/\u00a0/g, ' ')).toBe(
      'October: 120,00 €, September: 100,00 €, plus 20,00 €, plus 20 percent',
    );
    expect(day8.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('button', { name: 'Day 9' }).props.accessibilityState).toMatchObject({ selected: false });
    fireEvent.press(screen.getByRole('button', { name: 'Day 3' }));
    expect(events).toEqual([{ type: 'activate', day: 3 }]);
  });
});

describe('PaceChart, gesture', () => {
  it('a touch that stays on one day is a tap: down, up, and the pan fails so the scroll is free', async () => {
    const { events } = renderFull(twoLines());
    const calls = await touchPaceChart([{ x: dayX(8) }, { x: dayX(8) + 3 }]);
    expect(events).toEqual([{ type: 'down', day: 8 }, { type: 'up' }]);
    expect(calls).toEqual(['fail']);
  });

  it('a touch across days is a drag: one move per day change, then the pan ends', async () => {
    const { events } = renderFull(twoLines());
    const calls = await touchPaceChart([{ x: dayX(1) }, { x: dayX(2) }, { x: dayX(2) + 2 }, { x: dayX(4) }]);
    expect(events).toEqual([
      { type: 'down', day: 1 },
      { type: 'move', day: 2 },
      { type: 'move', day: 4 },
      { type: 'up' },
    ]);
    expect(calls).toEqual(['activate', 'end']);
  });

  it('a first vertical move on the touch-down day cancels and lets the screen scroll', async () => {
    const { events } = renderFull(twoLines());
    const calls = await dragPaceChartVertically(dayX(8));
    expect(events).toEqual([{ type: 'down', day: 8 }, { type: 'cancel' }]);
    expect(calls).toEqual(['fail']);
  });

  it('clamps touches beyond either edge to day 1 or day 31', async () => {
    const { events } = renderFull(twoLines());
    await touchPaceChart([{ x: -50 }]);
    await touchPaceChart([{ x: WIDTH + 50 }]);
    expect(events.filter((e) => e.type === 'down')).toEqual([
      { type: 'down', day: 1 },
      { type: 'down', day: 31 },
    ]);
  });
});

describe('PaceChart, motion', () => {
  it('reveals the lines with a cover only when asked and motion is on', () => {
    mockReduceMotion = false;
    const { view } = renderFull(twoLines());
    expect(screen.queryByTestId('pace-reveal')).toBeNull();
    view.unmount();
    render(<PaceChart variant="compact" pace={twoLines()} reveal />);
    expect(screen.getByTestId('pace-reveal', { includeHiddenElements: true })).toBeTruthy();
  });

  it('draws at once with reduce motion', () => {
    render(<PaceChart variant="compact" pace={twoLines()} reveal />);
    expect(screen.queryByTestId('pace-reveal', { includeHiddenElements: true })).toBeNull();
  });
});
