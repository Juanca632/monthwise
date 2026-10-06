import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase } from '../helpers/betterSqliteAdapter';

// The summary's entrance and month change (design.md, Motion), with animations on: suites
// default to reduce motion (tests/setup/motion.ts).
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), [effect]),
  };
});

const mockHaptics = { add: jest.fn(), monthChange: jest.fn() };
jest.mock('@/lib/haptics', () => ({ haptics: mockHaptics }));

const SummaryScreen = require('@/app/index').default;

const expense = (amountCents: number, date: string): TransactionInput => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note: null,
});

const flush = () => act(async () => {});

async function renderSummary(rows: TransactionInput[]) {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <SummaryScreen />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await flush();
}

const moving = () => screen.queryAllByTestId('appearing');
const offset = (node: ReturnType<typeof moving>[number]) => {
  const style = getAnimatedStyle(node) as {
    opacity: number;
    transform: [{ translateX: number }, { translateY: number }];
  };
  return { opacity: style.opacity, x: style.transform[0].translateX, y: style.transform[1].translateY };
};
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

ignoreListBatchingWarnings();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

// Twelve rows in October, one in September.
const OCTOBER = Array.from({ length: 12 }, (_, i) => expense(100 * (i + 1), `2026-10-${String(i + 1).padStart(2, '0')}`));

it('rises in on the cold start, and only the first screen of rows', async () => {
  await renderSummary(OCTOBER);
  // The card, the breakdown and the first 8 list items: the preview's 5 rows on 5 days make 10
  // items (day headers and rows), and only the first 8 animate.
  expect(moving()).toHaveLength(10);
  expect(offset(moving()[0])).toEqual({ opacity: 0, x: 0, y: 14 });

  wait(2000);
  for (const node of moving()) expect(offset(node)).toEqual({ opacity: 1, x: 0, y: 0 });
});

it('slides the new month in from the side of the button tapped', async () => {
  await renderSummary([...OCTOBER, expense(500, '2026-09-10')]);
  wait(2000);

  fireEvent.press(screen.getByRole('button', { name: 'Previous month, September 2026' }));
  await flush();
  // The card's numbers, the breakdown and the row come in from the left.
  const fromLeft = moving().map(offset).filter((o) => o.opacity === 0);
  expect(fromLeft.length).toBeGreaterThanOrEqual(3);
  for (const o of fromLeft) expect(o).toEqual({ opacity: 0, x: -18, y: 0 });

  wait(2000);
  fireEvent.press(screen.getByRole('button', { name: 'Next month, October 2026' }));
  await flush();
  const fromRight = moving().map(offset).filter((o) => o.opacity === 0);
  expect(fromRight.length).toBeGreaterThanOrEqual(3);
  for (const o of fromRight) expect(o).toEqual({ opacity: 0, x: 18, y: 0 });
});

it('plays one light haptic for Add and for each month change (design.md, Haptics)', async () => {
  await renderSummary(OCTOBER);
  fireEvent.press(screen.getByRole('button', { name: 'Add transaction' }));
  expect(mockHaptics.add).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Previous month, September 2026' }));
  await flush();
  expect(mockHaptics.monthChange).toHaveBeenCalledTimes(1);
});
