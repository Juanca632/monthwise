import { act } from '@testing-library/react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

// gesture-handler's `fireGestureHandler` (2.32) only emits state changes and gesture events; it
// never calls `onTouchesDown/Move/Up`, which the pace chart's manually activated pan is built on
// (T029 checked this). So tests call the pan's touch callbacks directly, with the events and the
// state manager the native side would give them, and record what the pan asked the manager.

type Handlers = {
  onTouchesDown?: (event: unknown, manager: StateManager) => void;
  onTouchesMove?: (event: unknown, manager: StateManager) => void;
  onTouchesUp?: (event: unknown, manager: StateManager) => void;
  onTouchesCancelled?: (event: unknown, manager: StateManager) => void;
};
type StateManager = { begin(): void; activate(): void; fail(): void; end(): void };

/** What the gesture asked the state manager, in order: `activate`, `fail`, `end`. */
export type ManagerCall = keyof StateManager;

const Y = 90;

function touchEvent(x: number, y: number) {
  const touch = { id: 0, x, y, absoluteX: x, absoluteY: y };
  return { handlerTag: 0, numberOfTouches: 1, state: 0, eventType: 0, allTouches: [touch], changedTouches: [touch] };
}

function paceHandlers(): Handlers {
  return (getByGestureTestId('pace-chart') as unknown as { handlers: Handlers }).handlers;
}

/**
 * One finger on the pace chart through `points` (x, y); returns the manager calls. Each callback
 * runs in its own `act`, as separate native events would.
 */
export async function touchPaceChart(points: { x: number; y?: number }[]): Promise<ManagerCall[]> {
  const calls: ManagerCall[] = [];
  const manager: StateManager = {
    begin: () => calls.push('begin'),
    activate: () => calls.push('activate'),
    fail: () => calls.push('fail'),
    end: () => calls.push('end'),
  };
  const at = (i: number) => touchEvent(points[i].x, points[i].y ?? Y);
  const handlers = () => paceHandlers();
  await act(async () => handlers().onTouchesDown?.(at(0), manager));
  for (let i = 1; i < points.length; i++) {
    await act(async () => handlers().onTouchesMove?.(at(i), manager));
  }
  await act(async () => handlers().onTouchesUp?.(at(points.length - 1), manager));
  return calls;
}

/** Touches down at `x` and moves 40 dp down on the same day: a scroll. */
export function dragPaceChartVertically(x: number): Promise<ManagerCall[]> {
  return touchPaceChart([{ x }, { x, y: Y + 40 }]);
}
