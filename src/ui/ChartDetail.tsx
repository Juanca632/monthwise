import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { durations, useReduceMotion } from './motion';
import { spacing, useTheme } from './theme';

/** The box settles from this far above (design.md, Motion, "Detail in"). */
const SETTLE_FROM = -6;
const BOX_RADIUS = 16;

type Props = {
  /** One Text per line (contracts/ui-screens.md): the first is the title, e.g. `Day 8`. */
  lines: string[];
  /** An optional button under the lines, e.g. US3's **View month**. */
  action?: ReactNode;
};

/**
 * The detail box under a chart (design.md, Detail boxes): the selected day's or month's lines.
 * It fades in and settles when it appears, and fades out when it leaves.
 */
export function ChartDetail({ lines, action }: Props) {
  const { colors, type } = useTheme();
  const reduceMotion = useReduceMotion();

  const entering = reduceMotion
    ? undefined
    : FadeInDown.duration(durations.fast).withInitialValues({
        opacity: 0,
        transform: [{ translateY: SETTLE_FROM }],
      });
  const exiting = reduceMotion ? undefined : FadeOut.duration(durations.fast);

  return (
    <Animated.View
      testID="chart-detail"
      entering={entering}
      exiting={exiting}
      style={[styles.box, { backgroundColor: colors.insetFill }]}
    >
      {lines.map((line, i) => (
        // Lines can repeat (two months with the same amount), so the index is the key.
        <Text key={i} style={[i === 0 ? type.labelStrong : type.body, { color: colors.text }]}>
          {line}
        </Text>
      ))}
      {action}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: BOX_RADIUS,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
  },
});
