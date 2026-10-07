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


// Two curves for one rhythm (fine-tuning 2026-10-07): what comes in slows down as it arrives
// (ease-out), what leaves speeds up as it goes (ease-in). An ease-out exit crawls through its last
// pixels, so the closing sheet's edge lingered on screen.
export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const easeIn = Easing.bezier(0.4, 0, 1, 1);
/** The same ease-out as a plain function, for values animated on the JS thread (counting). */
export const easeOutFn = Easing.bezierFn(0.2, 0.8, 0.2, 1);
// Every animation reads reduce motion through useReduceMotion and takes its own path, so
// Reanimated must not also skip it on its own.
export const spring = { damping: 15, stiffness: 300, reduceMotion: ReduceMotion.Never } as const;

/**
 * The app's two speeds (fine-tuning 2026-10-07): `fast` for small feedback (a chip, the toast's
 * fade, a dialog, the shake, every reduce motion fade) and `standard` for anything that moves or
 * changes on screen (the sheet, rows, month change, card tone, counting totals). Every duration
 * below is one of them, so all motion shares one rhythm.
 */
const FAST = 200;
const STANDARD = 300;

export const durations = {
  fast: FAST,
  standard: STANDARD,
  entrance: STANDARD,
  entranceStagger: 60,
  monthChange: STANDARD,
  count: STANDARD,
  toneChange: STANDARD,
  chipFill: FAST,
  shake: FAST,
  /** An edited row's flash. */
  rowChange: STANDARD,
  /** The other rows gliding to their new places when one comes or goes. */
  rowShift: STANDARD,
  sheet: STANDARD,
  /** The toast's whole life (not a motion), and its fade in and out. */
  toast: 1800,
  toastFade: FAST,
  dialog: FAST,
  /** The longest fade allowed under reduce motion. */
  reducedFade: FAST,
} as const;

export const distances = {
  entranceRise: 14,
  monthSlide: 18,
} as const;

/** The summary behind an open sheet (design.md, Motion, "Open a form"). */
export const behindSheet = { scale: 0.92, offset: 6 } as const;

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
