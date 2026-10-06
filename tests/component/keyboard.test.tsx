import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle, makeMutable } from 'react-native-reanimated';

import { Sheet } from '@/ui/Sheet';
import { FormHeader, TransactionForm } from '@/ui/TransactionForm';

// T068 (design.md, Transaction form, "Keyboard open"): the footer follows the keyboard.
const mockKeyboard = { height: makeMutable(0), state: makeMutable(0) };
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

function renderForm() {
  render(
    <Sheet header={<FormHeader title="Add transaction" onClose={jest.fn()} />}>
      <TransactionForm
        initial={{ type: 'expense', amountText: '', date: '2026-10-15', category: null, note: '' }}
        onSave={async () => null}
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
const keyboardAt = (height: number) =>
  act(() => {
    mockKeyboard.height.value = height;
    jest.advanceTimersByTime(16);
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockKeyboard.height.value = 0;
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
