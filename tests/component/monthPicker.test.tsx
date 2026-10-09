import { fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import type { YearMonth } from '@/domain/month';
import { MonthPicker } from '@/ui/MonthPicker';
import { minTouch, palettes } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
let mockReduceMotion = true;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const TODAY = '2026-10-12';

function renderPicker(selected: YearMonth = { year: 2026, month: 10 }) {
  const onChoose = jest.fn();
  const onClose = jest.fn();
  render(<MonthPicker selected={selected} today={TODAY} onChoose={onChoose} onClose={onClose} />);
  return { onChoose, onClose };
}
const button = (name: string) => screen.getByRole('button', { name });
const flat = (node: { props: { [key: string]: unknown } }) =>
  RN.StyleSheet.flatten(node.props.style as RN.StyleProp<RN.ViewStyle>);

beforeEach(() => {
  mockReduceMotion = true;
  mockFontScale = 1;
  jest.restoreAllMocks();
});

it('opens on the selected month year with its title and twelve months', () => {
  renderPicker({ year: 2024, month: 3 });
  expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
  expect(screen.getByLabelText('2024')).toBeTruthy();
  expect(button('March 2024').props.accessibilityState).toMatchObject({ selected: true, disabled: false });
  expect(screen.getAllByRole('button', { name: /^\w+ 2024$/ })).toHaveLength(12);
  expect(screen.getByText('Mar')).toBeTruthy();
});

it('year buttons change the shown year; Previous year is disabled on 2000, Next year on the current year', () => {
  renderPicker({ year: 2001, month: 5 });
  expect(button('Next year').props.accessibilityState).toMatchObject({ disabled: false });
  fireEvent.press(button('Previous year'));
  expect(screen.getByLabelText('2000')).toBeTruthy();
  expect(button('Previous year').props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(button('Previous year'));
  expect(screen.getByLabelText('2000')).toBeTruthy();
});

it('Next year is disabled on the current year', () => {
  renderPicker();
  expect(button('Next year').props.accessibilityState).toMatchObject({ disabled: true });
});

it('months after the current month are disabled and cannot be chosen', () => {
  const { onChoose } = renderPicker();
  expect(button('November 2026').props.accessibilityState).toMatchObject({ disabled: true });
  expect(button('October 2026').props.accessibilityState).toMatchObject({ disabled: false });
  fireEvent.press(button('December 2026'));
  expect(onChoose).not.toHaveBeenCalled();
});

it('choosing an available month calls onChoose with it', () => {
  const { onChoose } = renderPicker();
  fireEvent.press(button('Previous year'));
  fireEvent.press(button('March 2025'));
  expect(onChoose).toHaveBeenCalledWith({ year: 2025, month: 3 });
});

it('choosing the selected month only closes', () => {
  const { onChoose, onClose } = renderPicker();
  fireEvent.press(button('October 2026'));
  expect(onChoose).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('This month chooses the current month', () => {
  const { onChoose } = renderPicker({ year: 2024, month: 3 });
  fireEvent.press(button('This month'));
  expect(onChoose).toHaveBeenCalledWith({ year: 2026, month: 10 });
});

it('Close, Android back and the scrim close it; the scrim is not a screen reader element', () => {
  const { onClose } = renderPicker();
  fireEvent.press(button('Close'));
  screen.UNSAFE_getByType(RN.Modal).props.onRequestClose();
  const scrim = screen.getByTestId('month-picker-scrim', { includeHiddenElements: true });
  expect(scrim.props.accessible).toBe(false);
  fireEvent.press(scrim);
  expect(onClose).toHaveBeenCalledTimes(3);
});

it('every target is at least 48 dp', () => {
  renderPicker();
  for (const name of ['Previous year', 'Next year', 'March 2026', 'This month', 'Close']) {
    const style = flat(button(name));
    expect(Math.max(Number(style.minHeight ?? 0), Number(style.height ?? 0))).toBeGreaterThanOrEqual(minTouch);
  }
});

it('the year grid does not slide with reduce motion', () => {
  renderPicker();
  fireEvent.press(button('Previous year'));
  expect(screen.getByTestId('month-grid').props.entering).toBeUndefined();
});

it('the year grid slides in with motion on', () => {
  mockReduceMotion = false;
  renderPicker();
  fireEvent.press(button('Previous year'));
  expect(screen.getByTestId('month-grid').props.entering).toBeDefined();
});

it('at font scale 2 nothing is cut', () => {
  mockFontScale = 2;
  renderPicker();
  for (const t of screen.UNSAFE_getAllByType(RN.Text)) expect(t.props.numberOfLines).toBeUndefined();
});

it('uses the dark palette in dark mode', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  renderPicker();
  expect(flat(screen.getByTestId('month-picker')).backgroundColor).toBe(palettes.dark.surface);
  expect(flat(button('October 2026')).backgroundColor).toBe(palettes.dark.accent);
});
