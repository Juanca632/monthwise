import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { getAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
  SheetTransitionProvider,
  useSheetOpener,
  useSheetProgress,
  type SheetOpener,
} from '@/state/SheetTransitionContext';
import { BehindSheet } from '@/ui/BehindSheet';

// Only the screen that opened the sheet moves back: the summary hidden under See all stays still,
// so two full screens never animate at once (fine-tuning 2026-10-07).
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));

const sheet: { progress: SharedValue<number> | null; opener: SharedValue<SheetOpener> | null } = {
  progress: null,
  opener: null,
};
function Controls() {
  sheet.progress = useSheetProgress();
  sheet.opener = useSheetOpener();
  return null;
}

function renderBoth() {
  render(
    <SheetTransitionProvider>
      <Controls />
      <BehindSheet screen="summary" testID="summary">
        <Text>Summary</Text>
      </BehindSheet>
      <BehindSheet screen="all" testID="all">
        <Text>All</Text>
      </BehindSheet>
    </SheetTransitionProvider>,
  );
}

const scaleOf = (testID: string) =>
  (getAnimatedStyle(screen.getByTestId(testID)) as { transform: [unknown, { scale: number }] })
    .transform[1].scale;

const openFrom = (opener: SheetOpener) =>
  act(() => {
    sheet.opener!.value = opener;
    sheet.progress!.value = 1;
    jest.advanceTimersByTime(16);
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('moves back only See all when the sheet opens from it', () => {
  renderBoth();
  openFrom('all');
  expect(scaleOf('all')).toBeCloseTo(0.92);
  expect(scaleOf('summary')).toBe(1);
});

it('moves back the summary when the sheet opens from it', () => {
  renderBoth();
  openFrom('summary');
  expect(scaleOf('summary')).toBeCloseTo(0.92);
  expect(scaleOf('all')).toBe(1);
});
