import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from './glass';
import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

type Action = { label: string; onPress(): void };

type Props =
  /** Empty month: a centered card with an icon, a line and an optional helper line. */
  | {
      variant: 'card';
      message: string;
      helper?: string;
      icon?: ComponentProps<typeof Feather>['name'];
    }
  /** A plain muted line inside another card ("No expenses this month."). */
  | { variant: 'inline'; message: string }
  /** One-off notice above the content, with a text button to dismiss it. */
  | { variant: 'banner'; message: string; action: Action };

/** Short state lines for the summary (design.md, Summary screen items 2, 5 and 6). */
export function StateMessage(props: Props) {
  const { colors, type } = useTheme();

  if (props.variant === 'inline') {
    return (
      <Text style={[type.body, styles.inline, { color: colors.textMuted }]}>{props.message}</Text>
    );
  }

  if (props.variant === 'banner') {
    return (
      <GlassCard
        radius={radii.input}
        fill={colors.bannerFill}
        border={colors.glassBorder}
        style={styles.bannerWrapper}
        contentStyle={styles.banner}
      >
        <View style={styles.bannerMessage}>
          <View importantForAccessibility="no-hide-descendants">
            <Feather name="alert-circle" size={iconSize.message} color={colors.text} />
          </View>
          <Text style={[type.label, styles.flex, { color: colors.text }]}>{props.message}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.action.label}
          onPress={props.action.onPress}
          // The card clips this ripple (design.md, Touch feedback).
          android_ripple={{ color: colors.ripple }}
          style={styles.textButton}
        >
          <Text style={[type.labelStrong, { color: colors.accent }]}>{props.action.label}</Text>
        </Pressable>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      radius={radii.card}
      fill={colors.glassFill}
      border={colors.glassBorder}
      style={styles.cardWrapper}
      contentStyle={styles.card}
    >
      {props.icon && (
        <View
          importantForAccessibility="no-hide-descendants"
          style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}
        >
          <Feather name={props.icon} size={iconSize.emptyState} color={colors.accent} />
        </View>
      )}
      <Text style={[type.bodyStrong, styles.centered, { color: colors.text }]}>{props.message}</Text>
      {props.helper && (
        <Text style={[type.label, styles.centered, { color: colors.textMuted }]}>{props.helper}</Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  inline: { padding: spacing.md },
  cardWrapper: { marginHorizontal: spacing.md, marginTop: spacing.xxl },
  card: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrapper: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  banner: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerMessage: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  textButton: {
    alignSelf: 'flex-end',
    minHeight: minTouch,
    minWidth: minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
