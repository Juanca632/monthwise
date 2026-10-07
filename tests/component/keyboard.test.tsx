import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle, KeyboardState, makeMutable } from 'react-native-reanimated';

import { Sheet } from '@/ui/Sheet';
import { FormHeader, TransactionForm } from '@/ui/TransactionForm';

// T068 (design.md, Transaction form, "Keyboard open"): the footer follows the keyboard.
const mockKeyboard = { height: makeMutable(0), state: makeMutable(4) };
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useAnimatedKeyboard: () => mockKeyboard,
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
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => {} }));

// Closed, the footer rests 28 + insets.bottom above the bottom edge; open, 12 dp above the keyboard.
const REST = 28 + INSETS.bottom;
const GAP = 12;

function renderForm({ withDelete = false } = {}) {
  render(
    <Sheet header={<FormHeader title="Add transaction" onClose={jest.fn()} />}>
      <TransactionForm
        initial={{ type: 'expense', amountText: '', date: '2026-10-15', category: null, note: '' }}
        onSave={async () => null}
        onDelete={withDelete ? async () => null : undefined}
        onDone={jest.fn()}
      />
    </Sheet>,
  );
}

const footerLift = () => {
  const style = getAnimatedStyle(screen.getByTestId('form-footer')) as { transform: [{ translateY: number }] };
  return -style.transform[0].translateY;
};
const spacer = () => (getAnimatedStyle(screen.getByTestId('keyboard-spacer')) as { height: number }).height;
const keyboardAt = (height: number, state = height > 0 ? KeyboardState.OPEN : KeyboardState.CLOSED) =>
  act(() => {
    mockKeyboard.height.value = height;
    mockKeyboard.state.value = state;
    jest.advanceTimersByTime(16);
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockKeyboard.height.value = 0;
  mockKeyboard.state.value = KeyboardState.CLOSED;
});
afterEach(() => jest.useRealTimers());

it('rests at 28 + the bottom inset with the keyboard closed', () => {
  renderForm();
  keyboardAt(0);
  expect(footerLift()).toBe(0);
  expect(spacer()).toBe(0);
  expect(screen.getByTestId('form-footer').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ paddingBottom: REST })]),
  );
});

it('follows the keyboard frame by frame, 12 dp above it', () => {
  renderForm();
  keyboardAt(150);
  expect(footerLift()).toBe(150 + GAP - REST);
  keyboardAt(300);
  expect(footerLift()).toBe(300 + GAP - REST);
  keyboardAt(0);
  expect(footerLift()).toBe(0);
});

it('gives the fields as much room as the footer rose, so Date and Note stay reachable', () => {
  renderForm();
  keyboardAt(300);
  expect(spacer()).toBe(footerLift());
  expect(screen.getByText('Date')).toBeTruthy();
  expect(screen.getByLabelText(/^Note \(optional\)/)).toBeTruthy();
});

it('tightens the amount block from 32/24 to 16/12 as the keyboard comes up', () => {
  renderForm();
  const padding = () =>
    getAnimatedStyle(screen.getByTestId('field-amount')) as { paddingTop: number; paddingBottom: number };
  keyboardAt(0);
  expect(padding()).toMatchObject({ paddingTop: 32, paddingBottom: 24 });
  keyboardAt(60);
  expect(padding()).toMatchObject({ paddingTop: 24, paddingBottom: 18 });
  keyboardAt(300);
  expect(padding()).toMatchObject({ paddingTop: 16, paddingBottom: 12 });
});

it('folds Delete away as the keyboard opens, so only Save rides above it', () => {
  renderForm({ withDelete: true });
  const slot = () => getAnimatedStyle(screen.getByTestId('delete-slot')) as { height: number; opacity: number };
  keyboardAt(0);
  expect(slot()).toMatchObject({ height: 48, opacity: 1 });
  keyboardAt(60);
  expect(slot()).toMatchObject({ height: 24, opacity: 0.5 });
  keyboardAt(300);
  expect(slot()).toMatchObject({ height: 0, opacity: 0 });
});

it("gives the footer the sheet's fill, so nothing shows through it over the fields", () => {
  renderForm();
  expect(screen.getByTestId('form-footer').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ backgroundColor: expect.any(String) })]),
  );
});

it('ignores a height left over from a keyboard the form never saw close', () => {
  renderForm({ withDelete: true });
  keyboardAt(300, KeyboardState.CLOSED);
  expect(footerLift()).toBe(0);
  expect(spacer()).toBe(0);
  keyboardAt(300, KeyboardState.UNKNOWN);
  expect(footerLift()).toBe(0);
  // While it closes, the footer still follows it down.
  keyboardAt(150, KeyboardState.CLOSING);
  expect(footerLift()).toBe(150 + GAP - REST);
});
