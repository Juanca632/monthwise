import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { ShapePressable } from '@/ui/glass';
import { PressableScale } from '@/ui/motion';
import { palettes } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true }));
// PressableScale reads reduce motion inside its own module, so the switch is Reanimated's hook.
const mockReduceMotion = jest.fn(() => false);
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion(),
}));

const scaleOf = (label: string) => {
  const transform = getAnimatedStyle(screen.getByRole('button', { name: label })).transform as
    | { scale: number }[]
    | undefined;
  return transform?.[0]?.scale ?? 1;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion.mockReturnValue(false);
});

afterEach(() => jest.useRealTimers());

function renderButton(onPress = jest.fn()) {
  render(
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Next month"
      onPress={onPress}
      android_ripple={{ color: palettes.light.ripple, borderless: true, radius: 24 }}
      style={{ minHeight: 48 }}
    >
      <Text>›</Text>
    </PressableScale>,
  );
  return onPress;
}

describe('PressableScale (design.md, Motion, "Press")', () => {
  it('keeps role, label, size, ripple and the press itself', () => {
    const onPress = renderButton();
    const button = screen.getByRole('button', { name: 'Next month' });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(48);
    const withRipple = screen.UNSAFE_root.findAll((n) => n.props.android_ripple !== undefined);
    expect(withRipple[0].props.android_ripple).toEqual({
      color: palettes.light.ripple,
      borderless: true,
      radius: 24,
    });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('scales down while pressed and springs back', () => {
    renderButton();
    fireEvent(screen.getByRole('button', { name: 'Next month' }), 'pressIn');
    // The spring settles after a small overshoot.
    act(() => jest.advanceTimersByTime(1000));
    expect(scaleOf('Next month')).toBeCloseTo(0.96, 2);

    fireEvent(screen.getByRole('button', { name: 'Next month' }), 'pressOut');
    act(() => jest.advanceTimersByTime(1000));
    expect(scaleOf('Next month')).toBeCloseTo(1, 2);
  });

  it('does not scale under reduce motion', () => {
    mockReduceMotion.mockReturnValue(true);
    renderButton();
    fireEvent(screen.getByRole('button', { name: 'Next month' }), 'pressIn');
    act(() => jest.advanceTimersByTime(300));
    expect(scaleOf('Next month')).toBe(1);
  });

  it('keeps the pressed overlay under reduce motion', () => {
    mockReduceMotion.mockReturnValue(true);
    render(
      <ShapePressable testOnly_pressed accessibilityRole="button" accessibilityLabel="Food">
        <Text>Food</Text>
      </ShapePressable>,
    );
    expect(screen.getByTestId('pressed-overlay')).toBeTruthy();
    expect(scaleOf('Food')).toBe(1);
  });
});
