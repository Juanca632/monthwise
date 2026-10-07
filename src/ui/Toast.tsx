// The confirmation toast (design.md, Toast; FR-032): a small glass pill above Add that rises in,
// stays and fades out. It shows over the summary while the sheet closes, never takes touches and
// is announced once.
import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast, type ShownToast } from '@/state/ToastContext';

import { durations, easeIn, easeOut, useReduceMotion } from './motion';
import { iconSize, insetHighlight, radii, spacing, useTheme } from './theme';

const RISE = 16;
const MIN_HEIGHT = 44;
const never = { reduceMotion: ReduceMotion.Never };

/** Mounted once in the root layout, above the navigator. */
export function Toast() {
  const { toast, clear } = useToast();
  if (!toast) return null;
  // Keyed by id: a new toast restarts its own timing.
  return <ToastPill key={toast.id} toast={toast} onDone={() => clear(toast.id)} />;
}

function ToastPill({ toast, onDone }: { toast: ShownToast; onDone(): void }) {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const shown = useSharedValue(0);
  const risen = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(toast.message);
    const fade = reduceMotion ? durations.reducedFade : durations.toastFade;
    const stay = durations.toast - 2 * fade;
    shown.set(
      withSequence(
        withTiming(1, { duration: fade, easing: easeOut, ...never }),
        // Stays: a timing to the same value holds it for `stay`.
        withTiming(1, { duration: stay, ...never }),
        withTiming(0, { duration: fade, easing: easeIn, ...never }),
      ),
    );
    if (!reduceMotion) risen.set(withTiming(1, { duration: fade, easing: easeOut, ...never }));
    const timer = setTimeout(onDone, durations.toast);
    return () => clearTimeout(timer);
    // Runs once per toast; onDone only clears this toast's id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motion = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: RISE * (1 - risen.value) }],
  }));

  return (
    <Animated.View
      testID="toast"
      pointerEvents="none"
      // Announced once instead; it is never a focus stop.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.wrapper,
        // design.md, Toast: `28 + insets.bottom` above the bottom edge.
        { bottom: spacing.xxl + insets.bottom, boxShadow: colors.glassShadow },
        motion,
      ]}
    >
      <View
        style={[
          styles.pill,
          {
            experimental_backgroundImage: colors.sheetFill,
            borderColor: colors.glassBorderStrong,
            boxShadow: insetHighlight(colors.glassHighlight),
          },
        ]}
      >
        <Feather name="check" size={iconSize.circle} color={colors.text} />
        <Text style={[type.labelStrong, { color: colors.text }]}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The shadow sits on this wrapper, which does not clip; the pill clips its fill.
  wrapper: { position: 'absolute', alignSelf: 'center', borderRadius: radii.full },
  pill: {
    minHeight: MIN_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
});
