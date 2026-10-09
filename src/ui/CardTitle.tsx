import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, useTheme } from './theme';

/**
 * A card's small, quiet title (fine-tuning 2026-10-09, like Revolut): only where the content does
 * not explain itself, such as a chart, in `textMuted` so the numbers stay what stands out.
 * `inside` sits at the top of a card; otherwise it sits above a list or a row of tiles, in line
 * with them, with its action, if any, on the right.
 */
export function CardTitle({ title, inside = false, action }: { title: string; inside?: boolean; action?: ReactNode }) {
  const { colors, type } = useTheme();
  const text = (
    <Text accessibilityRole="header" style={[type.labelStrong, styles.flex, { color: colors.textMuted }]}>
      {title}
    </Text>
  );
  if (inside) return text;
  return (
    <View style={[styles.outside, action ? styles.withAction : null]}>
      {text}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  outside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  // An action button brings its own padding, so it lines up with the cards' edge.
  withAction: { paddingRight: spacing.md },
  flex: { flexShrink: 1, flexGrow: 1 },
});
