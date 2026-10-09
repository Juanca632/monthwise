/**
 * The app harness for black-box tests (specs/002-monthly-charts/contracts/test-harness.md). It
 * renders the real summary, Insights and All transactions screens over real SQL, with a fake
 * router stack, and owns every mock they need. Import it before any '@/...' module: the mocks
 * below are registered on import.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createContext, useEffect, useLayoutEffect, useState, type ComponentType } from 'react';
import { AccessibilityInfo, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import type { SqlParam } from '@/data/sqlDatabase';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { YearMonth } from '@/domain/month';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { SheetTransitionProvider } from '@/state/SheetTransitionContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';
import { ToastProvider } from '@/state/ToastContext';

import { openTestDatabase, type TestDatabase } from './betterSqliteAdapter';
import { ignoreListBatchingWarnings } from './listWarnings';
import { dragPaceChartVertically, touchPaceChart } from './paceGesture';

// ---------------------------------------------------------------------------------------------
// Mocks. Jest hoists these above the imports; their factories only read the `mock*` objects
// lazily, once a screen runs, so the objects below are defined by then.

/** The phone's date. `useToday` re-reads it only when the app comes back to the foreground. */
const mockClock = { today: '2026-10-12', listeners: new Set<() => void>() };
jest.mock('@/hooks/useToday', () => {
  const { useEffect: useEffectReal, useState: useStateReal } = require('react');
  return {
    getToday: () => mockClock.today,
    useToday: () => {
      const [today, setToday] = useStateReal(mockClock.today);
      useEffectReal(() => {
        const listener = () => setToday(mockClock.today);
        mockClock.listeners.add(listener);
        return () => mockClock.listeners.delete(listener);
      }, []);
      return today;
    },
  };
});

const mockRegion = { tag: 'es-ES' };
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: mockRegion.tag, regionCode: mockRegion.tag.split('-')[1] ?? null }],
}));

jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
// React Native's Jest mock reports a font scale of 2 (large text); a phone's default is 1.0.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));
// The real expo-font needs expo-asset, which npm nests under expo/ where Jest cannot resolve it.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockSqlite = { open: (): Promise<unknown> => Promise.reject(new Error('no app rendered')) };
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: () => mockSqlite.open() }));

type ScreenName = 'summary' | 'insights' | 'transactions';
type Href = string | { pathname: string };

/** One screen on the fake stack. `pushed` screens get a `transitionEnd` right after they mount. */
type StackEntry = {
  name: ScreenName;
  key: number;
  pushed: boolean;
  transitionEnded: boolean;
  transitionEndListeners: Set<(e: unknown) => void>;
};

const mockStack = {
  /** Bumped to give the top screen focus again: every mounted `useFocusEffect` re-runs. */
  focusTick: 0,
  focusListeners: new Set<() => void>(),
  push: (_href: Href) => {},
  pop: () => {},
  ScreenContext: createContext<StackEntry | null>(null),
};
jest.mock('expo-router', () => {
  const React = require('react');
  const subscribe = (listener: () => void) => {
    mockStack.focusListeners.add(listener);
    return () => mockStack.focusListeners.delete(listener);
  };
  const router = { push: (href: Href) => mockStack.push(href), back: () => mockStack.pop() };
  return {
    useRouter: () => router,
    useNavigation: () => {
      const entry: StackEntry | null = React.useContext(mockStack.ScreenContext);
      return {
        dispatch: () => {},
        addListener: (event: string, listener: (e: unknown) => void) => {
          if (event !== 'transitionEnd' || !entry?.pushed || entry.transitionEnded) return () => {};
          entry.transitionEndListeners.add(listener);
          return () => entry.transitionEndListeners.delete(listener);
        },
      };
    },
    useFocusEffect: (effect: () => void | (() => void)) => {
      const tick = React.useSyncExternalStore(subscribe, () => mockStack.focusTick);
      React.useEffect(() => effect(), [effect, tick]);
    },
  };
});
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => {} }));

// ---------------------------------------------------------------------------------------------
// Public surface (contracts/test-harness.md).

export type RenderAppOptions = {
  today: string;
  region?: string;
  transactions?: TransactionInput[];
  screenReader?: boolean;
};

export type AppHandle = {
  readonly screen: ScreenName;
  selectMonth(ym: YearMonth): Promise<void>;
  back(): Promise<void>;
  tapOutsidePicker(): Promise<void>;
  add(input: TransactionInput): Promise<number>;
  update(id: number, input: TransactionInput): Promise<void>;
  remove(id: number): Promise<void>;
  setToday(iso: string): Promise<void>;
  setScreenReader(on: boolean): Promise<void>;
  failReads(on: boolean): void;
  settle(): Promise<void>;
  paceChart: {
    touch(xs: number[]): Promise<void>;
    tapAt(x: number): Promise<void>;
    dragVertically(x: number): Promise<void>;
    readonly width: number;
  };
  unmount(): void;
};

const notWiredYet = (member: string, task: string) => async () => {
  throw new Error(`${member} is not wired yet (${task})`);
};

/** The pace chart's touch width in tests: 10 dp per day (contracts/test-harness.md). */
const PACE_CHART_WIDTH = 310;

/** Jest has no layout, so the harness gives a rendered pace chart its width. */
function layoutPaceChart() {
  const chart = screen.queryByTestId('pace-chart');
  if (!chart) return;
  fireEvent(chart, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: PACE_CHART_WIDTH, height: 180 } },
  });
}

/** Flushes promise chains and the state updates they cause; the SQL adapter answers in microtasks. */
async function settle() {
  for (let round = 0; round < 3; round++) {
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    // Same width each time, so a chart that already has it does not re-render.
    layoutPaceChart();
  }
}

const screenOf = (href: Href): ScreenName | null => {
  const path = typeof href === 'string' ? href : href.pathname;
  if (path === '/insights') return 'insights';
  if (path === '/transactions') return 'transactions';
  // The forms are not part of the harness: tests add, edit and delete through the handle.
  return null;
};

let nextKey = 0;
const entry = (name: ScreenName, pushed: boolean): StackEntry => ({
  name,
  key: nextKey++,
  pushed,
  transitionEnded: !pushed,
  transitionEndListeners: new Set(),
});

function ScreenHost({ entry: current, component: Screen }: { entry: StackEntry; component: ComponentType }) {
  // Children's effects run first, so a screen subscribes to `transitionEnd` before it fires.
  useEffect(() => {
    if (current.transitionEnded) return;
    void Promise.resolve().then(() => {
      current.transitionEnded = true;
      current.transitionEndListeners.forEach((listener) => listener({ data: { closing: false } }));
      current.transitionEndListeners.clear();
    });
  }, [current]);
  return (
    <mockStack.ScreenContext.Provider value={current}>
      <Screen />
    </mockStack.ScreenContext.Provider>
  );
}

/** Renders only the screen on top, so queries never find a lower screen's texts. */
function FakeStack({
  screens,
  stackRef,
}: {
  screens: Record<ScreenName, ComponentType>;
  stackRef: { current: StackEntry[] };
}) {
  const [stack, setStack] = useState<StackEntry[]>(() => [entry('summary', false)]);
  // Layout effects run inside the same `act`, so the handle sees the new stack right away.
  useLayoutEffect(() => {
    stackRef.current = stack;
  }, [stackRef, stack]);
  useLayoutEffect(() => {
    mockStack.push = (href) => {
      const name = screenOf(href);
      if (name) setStack((s) => [...s, entry(name, true)]);
    };
    mockStack.pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const top = stack[stack.length - 1];
  return <ScreenHost key={top.key} entry={top} component={screens[top.name]} />;
}

function SelectedMonthProbe({ monthRef }: { monthRef: { current: SelectedMonthValue | null } }) {
  const value = useSelectedMonth();
  useLayoutEffect(() => {
    monthRef.current = value;
  }, [monthRef, value]);
  return null;
}

/** AccessibilityInfo's screen reader state, with its change event. */
function installScreenReader(initial: boolean) {
  const state = { on: initial, handlers: new Set<(on: boolean) => void>() };
  const spies = [
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockImplementation(() => Promise.resolve(state.on)),
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    event: string,
    handler: (value: unknown) => void,
  ) => {
    if (event !== 'screenReaderChanged') return { remove: () => {} };
    const typed = handler as (on: boolean) => void;
    state.handlers.add(typed);
    return { remove: () => state.handlers.delete(typed) };
  }) as unknown as typeof AccessibilityInfo.addEventListener),
  ];
  return { state, restore: () => spies.forEach((spy) => spy.mockRestore()) };
}

// The summary's list prints a timing-only act() warning on slow machines (listWarnings.ts).
ignoreListBatchingWarnings();

const openApps = new Set<() => void>();
afterEach(() => {
  openApps.forEach((close) => close());
  openApps.clear();
});

export async function renderApp(options: RenderAppOptions): Promise<AppHandle> {
  mockClock.today = options.today;
  mockRegion.tag = options.region ?? 'es-ES';
  mockStack.focusTick = 0;

  const db: TestDatabase = openTestDatabase();
  await openAndMigrate(db);
  // The harness writes through its own repository on the plain database; `failReads` only
  // affects the app's reads.
  const repository = createTransactionRepository(db);
  let createdAt = 1;
  for (const input of options.transactions ?? []) await repository.create(input, createdAt++);

  let failing = false;
  const failable =
    <A extends unknown[], R>(read: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> =>
      failing ? Promise.reject(new Error('simulated read failure')) : read(...args);
  const appDb = {
    ...db,
    getAllAsync: failable(<T,>(sql: string, ...params: SqlParam[]) => db.getAllAsync<T>(sql, ...params)),
    getFirstAsync: failable(<T,>(sql: string, ...params: SqlParam[]) => db.getFirstAsync<T>(sql, ...params)),
    closeAsync: async () => {},
  };
  mockSqlite.open = () => Promise.resolve(appDb);

  const { state: screenReader, restore: restoreScreenReader } = installScreenReader(
    options.screenReader ?? false,
  );

  // Required here, after the mocks are registered and set for this app.
  const screens: Record<ScreenName, ComponentType> = {
    summary: require('@/app/index').default,
    insights: require('@/app/insights').default,
    transactions: require('@/app/transactions').default,
  };
  const stackRef: { current: StackEntry[] } = { current: [] };
  const month: { current: SelectedMonthValue | null } = { current: null };

  const rendered = render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <SelectedMonthProvider>
          <SummaryNoticeProvider>
            <SheetTransitionProvider>
              <ToastProvider>
                <SelectedMonthProbe monthRef={month} />
                <FakeStack screens={screens} stackRef={stackRef} />
              </ToastProvider>
            </SheetTransitionProvider>
          </SummaryNoticeProvider>
        </SelectedMonthProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>,
  );

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    rendered.unmount();
    db.close();
    restoreScreenReader();
  };
  openApps.add(close);

  const refocus = async () => {
    await act(async () => {
      mockStack.focusTick++;
      mockStack.focusListeners.forEach((listener) => listener());
    });
    await settle();
  };

  await settle();

  return {
    get screen() {
      return stackRef.current[stackRef.current.length - 1].name;
    },
    async selectMonth(ym) {
      await act(async () => month.current!.setSelected(ym));
      await settle();
    },
    async back() {
      // An open dialog (the month picker) takes the system back first, as on Android.
      const dialog = screen
        .UNSAFE_queryAllByType(Modal)
        .find((m) => m.props.visible !== false && typeof m.props.onRequestClose === 'function');
      if (dialog) {
        await act(async () => dialog.props.onRequestClose());
      } else {
        if (stackRef.current.length < 2) throw new Error('back(): the summary is the first screen');
        await act(async () => mockStack.pop());
      }
      await settle();
    },
    tapOutsidePicker: notWiredYet('tapOutsidePicker', 'T051'),
    async add(input) {
      const { id } = await repository.create(input, createdAt++);
      await refocus();
      return id;
    },
    async update(id, input) {
      await repository.update(id, input);
      await refocus();
    },
    async remove(id) {
      await repository.remove(id);
      await refocus();
    },
    async setToday(iso) {
      await act(async () => {
        mockClock.today = iso;
        mockClock.listeners.forEach((listener) => listener());
      });
      await settle();
    },
    async setScreenReader(on) {
      await act(async () => {
        screenReader.on = on;
        screenReader.handlers.forEach((handler) => handler(on));
      });
      await settle();
    },
    failReads(on) {
      failing = on;
    },
    settle,
    paceChart: {
      // gesture-handler's jest-utils cannot drive the pan's touch callbacks (paceGesture.ts).
      async touch(xs) {
        await touchPaceChart(xs.map((x) => ({ x })));
        await settle();
      },
      async tapAt(x) {
        await touchPaceChart([{ x }]);
        await settle();
      },
      async dragVertically(x) {
        await dragPaceChartVertically(x);
        await settle();
      },
      width: PACE_CHART_WIDTH,
    },
    unmount: () => {
      close();
      openApps.delete(close);
    },
  };
}
