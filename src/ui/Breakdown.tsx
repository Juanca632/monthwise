import { StyleSheet, Text, View } from 'react-native';

import { labelFor } from '@/domain/categories';
import type { BreakdownItem } from '@/domain/summary';
import { formatMoney } from '@/format/money';

import { GlassCard } from './glass';
import { StateMessage } from './StateMessage';
import { radii, spacing, useTheme } from './theme';

type Props = { items: readonly BreakdownItem[]; tag: string };

/** Spending by category, largest first (design.md, Summary screen item 2; FR-016). */
export function Breakdown({ items, tag }: Props) {
  const { colors, type } = useTheme();
  return (
    <>
      <Text style={[type.section, styles.sectionTitle, { color: colors.text }]}>
        Spending by category
      </Text>
      <GlassCard
        radius={radii.card}
        fill={colors.glassFill}
        border={colors.glassBorder}
        highlight
        shadow={colors.glassShadow}
        style={styles.card}
        contentStyle={styles.cardContent}
      >
        {items.length === 0 ? (
          <StateMessage variant="inline" message="No expenses this month." />
        ) : (
          items.map((item, index) => (
            <BreakdownRow
              key={item.category}
              item={item}
              tag={tag}
              last={index === items.length - 1}
            />
          ))
        )}
      </GlassCard>
    </>
  );
}

function BreakdownRow({ item, tag, last }: { item: BreakdownItem; tag: string; last: boolean }) {
  const { colors, type, isLargeText } = useTheme();
  const label = labelFor('expense', item.category);
  const amount = formatMoney(item.amountCents, tag);
  // "<1%" would be read as "less-than sign 1 percent", so it is spelled out.
  const spokenPercent =
    item.percentLabel === '<1%' ? 'less than 1 percent' : `${item.percent} percent`;

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${amount}, ${spokenPercent}`}
      style={[
        styles.row,
        isLargeText && styles.rowStacked,
        // The divider's width never changes, only its color: borders are never removed at
        // runtime (design.md, Glass surfaces).
        { borderBottomColor: last ? 'transparent' : colors.glassDivider },
      ]}
    >
      <Text style={[type.body, isLargeText ? undefined : styles.flex, { color: colors.text }]}>
        {label}
      </Text>
      {/* Large text: amount and pill move under the label, left-aligned (design.md). */}
      <View style={styles.values}>
        <Text style={[type.bodyStrong, { color: colors.text }]}>{amount}</Text>
        <Text style={[type.pill, styles.pill, { color: colors.accent, backgroundColor: colors.accentSoft }]}>
          {item.percentLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionTitle: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  card: { marginHorizontal: spacing.md },
  cardContent: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.md },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  values: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pill: {
    minWidth: 32,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
