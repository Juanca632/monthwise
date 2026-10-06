import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';

import type { TransactionDraft } from '@/domain/validation';
import { Sheet } from '@/ui/Sheet';
import { FormHeader, TransactionForm, type FormResult } from '@/ui/TransactionForm';

// The sheet's motion (design.md, Motion, "Sheet" and "Drag the sheet"), with animations on:
// suites default to reduce motion (tests/setup/motion.ts).
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
const INSETS = { top: 24, bottom: 16, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => INSETS }));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

// `back()` is what X, Android's back button and a long drag do: the navigator holds the removal
// and hands it to the form's guard while it prevents it (always, now).
const BACK = { type: 'GO_BACK' };
const mockDispatch = jest.fn();
const mockGuard: { callback: ((e: { data: { action: object } }) => void) | null } = { callback: null };
const mockBack = jest.fn(() => mockGuard.callback?.({ data: { action: BACK } }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useNavigation: () => ({ dispatch: mockDispatch }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (_prevent: boolean, callback: (e: { data: { action: object } }) => void) => {
    mockGuard.callback = callback;
  },
}));

const CLEAN: TransactionDraft = { type: 'expense', amountText: '', date: '2026-10-15', category: null, note: '' };
const SAVED: TransactionDraft = { type: 'expense', amountText: '12,50', date: '2026-10-10', category: 'food', note: '' };

function renderSheet(
  initial: TransactionDraft = CLEAN,
  handlers: { onSave?(): Promise<FormResult>; onDelete?(): Promise<FormResult> } = {},
) {
  const onDone = jest.fn(() => mockBack());
  render(
    <Sheet header={<FormHeader title="Edit transaction" onClose={() => mockBack()} />}>
      <TransactionForm
        initial={initial}
        onSave={handlers.onSave ?? (async () => null)}
        onDelete={handlers.onDelete}
        onDone={onDone}
      />
    </Sheet>,
  );
  return { onDone };
}

const sheetOffset = () => {
  const style = getAnimatedStyle(screen.getByTestId('sheet')) as { transform?: [{ translateY: number }] };
  return style.transform?.[0].translateY ?? 0;
};
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const flush = () => act(async () => {});
const alertButton = (text: string) =>
  (jest.mocked(Alert.alert).mock.calls.at(-1)![2] as AlertButton[]).find((b) => b.text === text)!;
const drag = (translationY: number, velocityY = 0) =>
  act(() =>
    fireGestureHandler(getByGestureTestId('sheet-drag'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: translationY / 2 },
      { state: State.ACTIVE, translationY },
      { state: State.END, translationY, velocityY },
    ]),
  );

beforeEach(() => {
  jest.useFakeTimers();
  mockDispatch.mockClear();
  mockBack.mockClear();
  mockGuard.callback = null;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.mocked(Alert.alert).mockRestore();
});

describe('the sheet (T066)', () => {
  it('slides up when it opens, with a grab handle hidden from the screen reader', () => {
    renderSheet();
    expect(sheetOffset()).toBeGreaterThan(0);
    wait(500);
    expect(sheetOffset()).toBe(0);
    const handle = screen.getByTestId('grab-handle', { includeHiddenElements: true });
    expect(handle.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('back on a clean form slides down before navigating', () => {
    renderSheet();
    wait(500);
    act(() => mockBack());
    expect(mockDispatch).not.toHaveBeenCalled();
    wait(150);
    expect(sheetOffset()).toBeGreaterThan(0);
    wait(200);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(BACK);
  });

  it('back on a dirty form asks "Discard changes?" and stays open', () => {
    renderSheet();
    wait(500);
    fireEvent.changeText(screen.getByTestId('amount-input'), '5');
    act(() => mockBack());
    expect(Alert.alert).toHaveBeenCalledWith('Discard changes?', undefined, expect.any(Array));
    wait(500);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(sheetOffset()).toBe(0);
  });

  it('Discard slides down, then navigates', () => {
    renderSheet();
    wait(500);
    fireEvent.changeText(screen.getByTestId('amount-input'), '5');
    act(() => mockBack());
    act(() => alertButton('Discard').onPress!());
    expect(mockDispatch).not.toHaveBeenCalled();
    wait(350);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('Save closes through the same path, once and with one slide', async () => {
    const { onDone } = renderSheet(SAVED);
    wait(500);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await flush();
    // The sheet slides down first; onDone navigates after it.
    expect(onDone).not.toHaveBeenCalled();
    wait(350);
    expect(onDone).toHaveBeenCalledTimes(1);
    // The guard lets that navigation through at once, without a second slide.
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    wait(500);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('Delete, after its confirmation, closes through the same path', async () => {
    const { onDone } = renderSheet(SAVED, { onDelete: async () => null });
    wait(500);
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    act(() => alertButton('Delete').onPress!());
    await flush();
    expect(onDone).not.toHaveBeenCalled();
    wait(350);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('a second back while sliding down navigates only once', () => {
    renderSheet();
    wait(500);
    act(() => mockBack());
    act(() => mockBack());
    wait(350);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});

describe('drag to close (T067)', () => {
  it('a short drag springs back', () => {
    renderSheet();
    wait(500);
    drag(100);
    expect(mockBack).not.toHaveBeenCalled();
    wait(1000);
    expect(sheetOffset()).toBeCloseTo(0, 0);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('a long drag closes a clean form', () => {
    renderSheet();
    wait(500);
    drag(600);
    expect(mockBack).toHaveBeenCalledTimes(1);
    wait(350);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('a fast downward fling closes, even when short', () => {
    renderSheet();
    wait(500);
    drag(60, 2000);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('a long drag on a dirty form asks "Discard changes?" and springs back', () => {
    renderSheet();
    wait(500);
    fireEvent.changeText(screen.getByTestId('amount-input'), '5');
    drag(600);
    expect(Alert.alert).toHaveBeenCalledWith('Discard changes?', undefined, expect.any(Array));
    wait(1000);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(sheetOffset()).toBeCloseTo(0, 0);
  });
});
