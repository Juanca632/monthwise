import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { labelFor } from '@/domain/categories';
import type { BreakdownItem } from '@/domain/summary';
import { formatMoney } from '@/format/money';

import { categoryLook } from './categoryLook';
import { StateMessage } from './StateMessage';
import { iconSize, radii, spacing, useTheme } from './theme';

type Props = { items: readonly BreakdownItem[]; tag: string };

const TILE_WIDTH = 132;
const ICON_CIRCLE = 36;

/**
 * Spending by category, largest first (FR-016), as a row of colored tiles: the category and its
 * share lead, the amount sits underneath (fine-tuning 2026-10-06: fewer numbers at a glance).
 */
export function Breakdown({ items, tag }: Props) {
  const { colors, type } = useTheme();
  return (
    <>
      <Text style={[type.heading, styles.sectionTitle, { color: colors.text }]}>
        Spending by category
      </Text>
      {items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <StateMessage variant="inline" message="No expenses this month." />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiles}
        >
          {items.map((item) => (
            <BreakdownTile key={item.category} item={item} tag={tag} />
          ))}
        </ScrollView>
      )}
    </>
  );
}

function BreakdownTile({ item, tag }: { item: BreakdownItem; tag: string }) {
  const { colors, type, scheme } = useTheme();
  const label = labelFor('expense', item.category);
  const amount = formatMoney(item.amountCents, tag);
  const look = categoryLook('expense', item.category, scheme, colors);
  // "<1%" would be read as "less-than sign 1 percent", so it is spelled out.
  const spokenPercent =
    item.percentLabel === '<1%' ? 'less than 1 percent' : `${item.percent} percent`;

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${amount}, ${spokenPercent}`}
      style={[
        styles.tile,
        { backgroundColor: colors.surface },
        colors.tileShadow !== '' && { boxShadow: colors.tileShadow },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.iconCircle, { backgroundColor: look.tint }]}
      >
        <Feather name={look.icon} size={iconSize.button} color={look.ink} />
      </View>
      <Text style={[type.body, { color: colors.text }]}>{label}</Text>
      <Text style={[type.title, { color: look.ink }]}>{item.percentLabel}</Text>
      <Text style={[type.caption, { color: colors.textMuted }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 32 dp of air above each section, so sections read apart (fine-tuning 2026-10-06).
  sectionTitle: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  tiles: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xs },
  tile: {
    // Grows with large text instead of cutting it (FR-031).
    minWidth: TILE_WIDTH,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyCard: { marginHorizontal: spacing.md, borderRadius: radii.card },
});
