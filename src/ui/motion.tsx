// Curves, durations and the press feedback from design.md (Motion). Everything here has a reduce
// motion path: Android's "Remove animations" turns movement into an instant swap.
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radii } from './theme';

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const sheetCurve = Easing.bezier(0.2, 0.9, 0.25, 1);
export const easeIn = Easing.bezier(0.4, 0, 1, 1);
/** The same ease-out as a plain function, for values animated on the JS thread (counting). */
export const easeOutFn = Easing.bezierFn(0.2, 0.8, 0.2, 1);
// Every animation reads reduce motion through useReduceMotion and takes its own path, so
// Reanimated must not also skip it on its own.
export const spring = { damping: 15, stiffness: 300, reduceMotion: ReduceMotion.Never } as const;

export const durations = {
  entrance: 520,
  entranceStagger: 80,
  monthChange: 340,
  count: 520,
  toneChange: 600,
  chipFill: 220,
  shake: 300,
  saved: 560,
  /** The toast's whole life, and its fade in and out. */
  toast: 1800,
  toastFade: 240,
  deleted: 280,
  /** The longest fade allowed under reduce motion. */
  reducedFade: 200,
} as const;

export const distances = {
  entranceRise: 14,
  monthSlide: 18,
  deleteSlide: 24,
} as const;

/** A new row grows in from this scale (Motion, "Saved"). */
export const createdRowScale = 0.97;

/** The summary behind an open sheet (design.md, Motion, "Open a form"). */
export const behindSheet = { scale: 0.92, offset: 6, radius: radii.sheet } as const;

/** Android's "Remove animations": every change becomes an instant swap (design.md, Reduce motion). */
export function useReduceMotion(): boolean {
  return useReducedMotion();
}

const PRESS_SCALE = 0.96;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * A Pressable that scales to 96 % while pressed and springs back (design.md, Motion, "Press").
 * Under reduce motion it does not scale; its ripple or pressed overlay stays. Motion never blocks
 * input: the press is handled right away.
 */
export function PressableScale({ style, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reduceMotion) scale.set(withSpring(PRESS_SCALE, spring));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(reduceMotion ? 1 : withSpring(1, spring));
        onPressOut?.(event);
      }}
      // Flat, so the animated transform merges with one plain style object.
      style={[StyleSheet.flatten(style), animated]}
    />
  );
}
