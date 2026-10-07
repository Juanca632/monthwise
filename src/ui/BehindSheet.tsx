import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useSheetOpener, useSheetProgress, type SheetOpener } from '@/state/SheetTransitionContext';

import { behindSheet, useReduceMotion } from './motion';
import { useTheme } from './theme';

/**
 * A screen that a form's sheet can open over (the summary, all transactions): while the sheet is
 * open it scales back and moves down, and a scrim dims it, all following the
 * sheet. Under reduce motion only the scrim fades (design.md, Motion, "Open a form").
 */
export function BehindSheet({
  screen,
  testID,
  children,
}: {
  /** Which screen this is; it moves only when it opened the sheet. */
  screen: SheetOpener;
  testID: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const progress = useSheetProgress();
  const opener = useSheetOpener();
  const reduceMotion = useReduceMotion();
  const content = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    // A screen under another one (the summary under See all) cannot be seen: it stays still.
    const p = opener.value === screen ? progress.value : 0;
    // Transforms only: they run on the GPU. An animated corner radius with clipping redrew the
    // whole screen every frame (dropped frames over See all's long list), and it never showed:
    // the screen and what is behind it share `background` under the same scrim (fine-tuning
    // 2026-10-07).
    return {
      transform: [
        { translateY: behindSheet.offset * p },
        { scale: 1 - (1 - behindSheet.scale) * p },
      ],
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: opener.value === screen ? progress.value : 0 }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.View
        testID={testID}
        style={[styles.screen, { backgroundColor: colors.background }, content]}
      >
        {children}
      </Animated.View>
      {/* Touches go to the sheet's screen above. */}
      <Animated.View
        testID="scrim"
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
