import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useSheetProgress } from '@/state/SheetTransitionContext';

import { behindSheet, useReduceMotion } from './motion';
import { useTheme } from './theme';

/**
 * A screen that a form's sheet can open over (the summary, all transactions): while the sheet is
 * open it scales back, moves down and rounds its corners, and a scrim dims it, all following the
 * sheet. Under reduce motion only the scrim fades (design.md, Motion, "Open a form").
 */
export function BehindSheet({ testID, children }: { testID: string; children: ReactNode }) {
  const { colors } = useTheme();
  const progress = useSheetProgress();
  const reduceMotion = useReduceMotion();
  const content = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const p = progress.value;
    return {
      borderRadius: behindSheet.radius * p,
      transform: [
        { translateY: behindSheet.offset * p },
        { scale: 1 - (1 - behindSheet.scale) * p },
      ],
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.View
        testID={testID}
        style={[styles.screen, styles.clip, { backgroundColor: colors.background }, content]}
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
  clip: { overflow: 'hidden' },
});
