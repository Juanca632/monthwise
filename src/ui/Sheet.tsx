// The form sheet (design.md, Transaction form and Motion, "Sheet"): it slides up over the summary,
// which scales back behind a scrim, and slides down before the form route is removed.
import { useRouter } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetProgress } from '@/state/SheetTransitionContext';

import { easeIn, sheetCurve, spring, useReduceMotion } from './motion';
import { radii, spacing, useTheme } from './theme';

/** The sheet's top edge sits this far below the status bar, so the summary shows above it. */
export const SHEET_TOP_GAP = 36;
const OPEN_MS = 440;
const CLOSE_MS = 300;
const FADE_MS = 200;
/** Released past this share of its height, or flung down faster than FLING, the sheet closes. */
const CLOSE_DRAG = 0.3;
const FLING = 1000;
const HANDLE = { width: 40, height: 5 };

type SheetControls = {
  /**
   * Slides the sheet down, then runs `then` (the navigation). Under reduce motion it closes at
   * once. Only the first call counts, so a second back press never navigates twice.
   */
  close(then: () => void): void;
  /**
   * True while the sheet slides down and its navigation has not run yet. Any other way out in
   * that time is dropped: the navigation is already on its way.
   */
  sliding(): boolean;
};

const SheetContext = createContext<SheetControls | null>(null);

/** The surrounding sheet's controls; null outside one. */
export function useSheet(): SheetControls | null {
  return useContext(SheetContext);
}

type Props = {
  /** The form header: with the grab handle, it is where the sheet can be dragged down. */
  header: ReactNode;
  children: ReactNode;
};

export function Sheet({ header, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const progress = useSheetProgress();
  const reduceMotion = useReduceMotion();
  // closing: a close started; released: its navigation ran (or is running).
  // A shared value, not a ref: the drag callbacks read it too.
  const closing = useSharedValue(false);
  const released = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const top = insets.top + SHEET_TOP_GAP;
  const height = windowHeight - top;

  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: reduceMotion ? FADE_MS : OPEN_MS,
        easing: sheetCurve,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    // Whatever removed the sheet (a failed load going back, a close that skipped the animation),
    // the summary behind must not stay scaled down.
    return () => progress.set(0);
  }, [progress, reduceMotion]);

  // A sheet removed before its slide ended (another navigation) must not navigate again later.
  useEffect(() => () => clearTimeout(closeTimer.current ?? undefined), []);

  const controls = useMemo<SheetControls>(
    () => ({
      close(then) {
        if (closing.get()) return;
        closing.set(true);
        const leave = () => {
          released.current = true;
          then();
        };
        if (reduceMotion) {
          progress.set(0);
          leave();
          return;
        }
        progress.set(
          withTiming(0, { duration: CLOSE_MS, easing: easeIn, reduceMotion: ReduceMotion.Never }),
        );
        // Navigation waits for the slide: the route removal itself has no animation.
        closeTimer.current = setTimeout(leave, CLOSE_MS);
      },
      sliding: () => closing.get() && !released.current,
    }),
    [progress, reduceMotion, closing],
  );

  // Dragging runs on the JS thread: the sheet follows the finger through the shared value, and the
  // close request goes through the same back path as X and Android's back button, so the discard
  // check runs (design.md, Motion, "Closing always goes through the discard check").
  const drag = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .withTestId('sheet-drag')
        // Under reduce motion nothing follows the finger; X and back still close (design.md).
        .enabled(!reduceMotion)
        .activeOffsetY(8)
        .onUpdate((e) => {
          // Once it is closing, the slide down wins over the finger.
          if (closing.get()) return;
          progress.set(1 - Math.max(0, e.translationY) / height);
        })
        .onEnd((e) => {
          if (closing.get()) return;
          // Back to open first: a dirty form keeps the sheet open behind "Discard changes?"; a
          // clean one starts the close slide from here, which replaces this spring.
          // Clamped: the sheet never springs above its resting place (design.md).
          progress.set(withSpring(1, { ...spring, overshootClamping: true }));
          const dragged = Math.max(0, e.translationY);
          if (dragged > height * CLOSE_DRAG || e.velocityY > FLING) router.back();
        }),
    [progress, height, router, reduceMotion, closing],
  );

  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.value }
      : { transform: [{ translateY: (1 - progress.value) * height }] },
  );

  return (
    <SheetContext.Provider value={controls}>
      <Animated.View
        testID="sheet"
        style={[
          styles.sheet,
          {
            top,
            experimental_backgroundImage: colors.sheetFill,
            borderColor: colors.glassBorderStrong,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={drag}>
          <View>
            <View
              testID="grab-handle"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[styles.handle, { backgroundColor: colors.textMuted }]}
            />
            {header}
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </SheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    // Only the top edge (design.md, Components).
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: HANDLE.width,
    height: HANDLE.height,
    borderRadius: radii.full,
    marginTop: spacing.xs,
    opacity: 0.4,
  },
});
