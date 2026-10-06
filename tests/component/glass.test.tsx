import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { AccentButton, AmbientBackground, ShapePressable } from '@/ui/glass';
import { useReduceMotion } from '@/ui/motion';
import { palettes } from '@/ui/theme';
import { Totals } from '@/ui/Totals';

jest.mock('expo-font', () => ({ isLoaded: () => true }));
jest.mock('@/ui/motion', () => ({
  ...jest.requireActual('@/ui/motion'),
  useReduceMotion: jest.fn(() => false),
}));

const balanceCard = (balanceCents: number) => (
  <Totals
    tag="es-ES"
    header={() => null}
    content={{ kind: 'values', incomeCents: 0, expenseCents: 0, balanceCents }}
  />
);

const opacityOf = (testID: string) =>
  // The layers sit inside the hidden background.
  getAnimatedStyle(screen.getByTestId(testID, { includeHiddenElements: true })).opacity;

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useReduceMotion).mockReturnValue(false);
});

afterEach(() => jest.useRealTimers());

describe('AmbientBackground', () => {
  it('is hidden from the screen reader and ignores touches', () => {
    render(<AmbientBackground tone="positive" />);
    const background = screen.getByTestId('ambient-background', { includeHiddenElements: true });
    expect(background.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(background.props.pointerEvents).toBe('none');
  });

  it('shows the current tone right away on first render', () => {
    render(<AmbientBackground tone="negative" />);
    expect(opacityOf('ambient-glow-negative')).toBe(1);
    expect(opacityOf('ambient-glow-positive')).toBe(0);
  });

  it('crossfades to the new tone over 600 ms', () => {
    render(<AmbientBackground tone="positive" />);
    screen.rerender(<AmbientBackground tone="negative" />);

    act(() => jest.advanceTimersByTime(300));
    const halfway = opacityOf('ambient-glow-negative');
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(1);

    act(() => jest.advanceTimersByTime(400));
    expect(opacityOf('ambient-glow-negative')).toBe(1);
    expect(opacityOf('ambient-glow-positive')).toBe(0);
  });

  it('swaps without a fade under reduce motion', () => {
    jest.mocked(useReduceMotion).mockReturnValue(true);
    render(<AmbientBackground tone="positive" />);
    screen.rerender(<AmbientBackground tone="negative" />);
    act(() => jest.advanceTimersByTime(16));
    expect(opacityOf('ambient-glow-negative')).toBe(1);
    expect(opacityOf('ambient-glow-positive')).toBe(0);
  });
});

describe('balance card (FR-015)', () => {
  it('crossfades its glass to the negative tone when the balance drops below zero', () => {
    render(balanceCard(1000));
    expect(opacityOf('card-glass-positive')).toBe(1);

    screen.rerender(balanceCard(-1000));
    act(() => jest.advanceTimersByTime(300));
    const halfway = opacityOf('card-glass-negative');
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(1);

    act(() => jest.advanceTimersByTime(400));
    expect(opacityOf('card-glass-negative')).toBe(1);
    expect(opacityOf('card-glass-positive')).toBe(0);
    // The label is built from the data, never from the fading layers.
    expect(screen.getByLabelText(/^Balance, /)).toBeTruthy();
  });

  it('swaps its glass without a fade under reduce motion', () => {
    jest.mocked(useReduceMotion).mockReturnValue(true);
    render(balanceCard(1000));
    screen.rerender(balanceCard(-1000));
    act(() => jest.advanceTimersByTime(16));
    expect(opacityOf('card-glass-negative')).toBe(1);
    expect(opacityOf('card-glass-positive')).toBe(0);
  });
});

describe('buttons', () => {
  it('AccentButton keeps its role, label and a 48 dp touch area', () => {
    render(
      <AccentButton accessibilityRole="button" accessibilityLabel="Save" onPress={jest.fn()}>
        <Text>Save</Text>
      </AccentButton>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    const style = StyleSheet.flatten(button.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    // The gradient and pressed overlay are clipped to the button's own shape.
    expect(style.overflow).toBe('hidden');
    expect(style.experimental_backgroundImage).toBe(palettes.light.accentGradient);
  });

  it('AccentButton shows the pressed overlay in rippleOnAccent and no android_ripple', () => {
    render(
      <AccentButton testOnly_pressed accessibilityRole="button" accessibilityLabel="Add">
        <Text>Add</Text>
      </AccentButton>,
    );
    const overlay = screen.getByTestId('pressed-overlay');
    expect(StyleSheet.flatten(overlay.props.style).backgroundColor).toBe(palettes.light.rippleOnAccent);
    expect(screen.getByRole('button', { name: 'Add' }).props.android_ripple).toBeUndefined();
  });

  it('ShapePressable shows the overlay only while pressed', () => {
    const button = (pressed: boolean) => (
      <ShapePressable testOnly_pressed={pressed} accessibilityRole="button" accessibilityLabel="Chip">
        <Text>Chip</Text>
      </ShapePressable>
    );
    render(button(false));
    expect(screen.queryByTestId('pressed-overlay')).toBeNull();
    screen.rerender(button(true));
    const overlay = screen.getByTestId('pressed-overlay');
    expect(StyleSheet.flatten(overlay.props.style).backgroundColor).toBe(palettes.light.ripple);
  });
});
