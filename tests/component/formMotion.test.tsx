import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Sheet } from '@/ui/Sheet';
import { palettes } from '@/ui/theme';
import { FormHeader, TransactionForm } from '@/ui/TransactionForm';

// T072 (design.md, Motion: "Type switch", "Pick a category", "Invalid Save").
const mockReduceMotion = jest.fn(() => false);
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion(),
}));
jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: () => {} }));

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
  // The track's padding box is 300 dp wide: two 148 dp segments 4 dp apart.
  fireEvent(screen.getByTestId('type-rail'), 'layout', { nativeEvent: { layout: { width: 300, height: 48 } } });
}

const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const translateX = (testID: string) =>
  ((getAnimatedStyle(screen.getByTestId(testID)) as { transform?: { translateX: number }[] }).transform?.[0]
    .translateX ?? 0);
const opacity = (testID: string) => (getAnimatedStyle(screen.getByTestId(testID)) as { opacity: number }).opacity;

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion.mockReturnValue(false);
});
afterEach(() => jest.useRealTimers());

describe('Type indicator', () => {
  it('slides to the other option with the spring', () => {
    renderForm();
    expect(translateX('type-indicator')).toBe(0);
    fireEvent.press(screen.getByRole('radio', { name: 'Income' }));
    wait(50);
    const moving = translateX('type-indicator');
    expect(moving).toBeGreaterThan(0);
    expect(moving).toBeLessThan(152);
    wait(1000);
    expect(translateX('type-indicator')).toBeCloseTo(152, 0);
  });

  it('swaps under reduce motion', () => {
    mockReduceMotion.mockReturnValue(true);
    renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Income' }));
    wait(16);
    expect(translateX('type-indicator')).toBe(152);
  });
});

describe('category chips', () => {
  it('fill with accent over 220 ms', () => {
    renderForm();
    fireEvent.press(screen.getByRole('button', { name: 'Food' }));
    wait(100);
    const halfway = opacity('chip-fill-selected');
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(1);
    wait(200);
    expect(opacity('chip-fill-selected')).toBe(1);
  });

  it('crossfade the label with the fill, so it stays readable', () => {
    renderForm();
    fireEvent.press(screen.getByRole('button', { name: 'Food' }));
    wait(100);
    const label = screen.getByText('Food');
    const color = (getAnimatedStyle(label) as { color: string }).color;
    expect(color).not.toBe(palettes.light.text);
    expect(color).not.toBe(palettes.light.onAccent);
    wait(200);
    // onAccent (#FFFFFF in light), as interpolateColor writes it.
    expect((getAnimatedStyle(screen.getByText('Food')) as { color: string }).color).toBe(
      'rgba(255, 255, 255, 1)',
    );
  });

  it('swap under reduce motion', () => {
    mockReduceMotion.mockReturnValue(true);
    renderForm();
    fireEvent.press(screen.getByRole('button', { name: 'Food' }));
    wait(16);
    expect(opacity('chip-fill-selected')).toBe(1);
  });
});

describe('invalid Save', () => {
  it('shakes the first invalid field only, then rests', () => {
    renderForm();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    wait(40);
    expect(Math.abs(translateX('field-amount'))).toBeGreaterThan(0);
    expect(translateX('field-category')).toBe(0);
    wait(400);
    expect(translateX('field-amount')).toBe(0);
  });

  it('does not shake under reduce motion', () => {
    mockReduceMotion.mockReturnValue(true);
    renderForm();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    wait(40);
    expect(translateX('field-amount')).toBe(0);
    expect(screen.getByText('Enter an amount.')).toBeTruthy();
  });
});

describe('flat form look (design.md, Components; T076)', () => {
  it('draws the sheet solid and Save as a solid accent button without border', () => {
    renderForm();
    expect(StyleSheet.flatten(screen.getByTestId('sheet').props.style)).toMatchObject({
      backgroundColor: palettes.light.formBackground,
    });
    const save = StyleSheet.flatten(screen.getByRole('button', { name: 'Save' }).props.style);
    expect(save.backgroundColor).toBe(palettes.light.accent);
    expect(save.borderWidth ?? 0).toBe(0);
    expect(save.experimental_backgroundImage).toBeUndefined();
  });

  it('gives unselected chips a solid fill with no visible border', () => {
    renderForm();
    const chip = StyleSheet.flatten(screen.getByRole('button', { name: 'Food' }).props.style);
    expect(chip).toMatchObject({ backgroundColor: palettes.light.surfaceMuted, borderColor: 'transparent' });
  });
});
