import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { ExpenseCategory } from '@/domain/categories';
import type { CategoryComparison } from '@/domain/categoryChanges';
import type { YearMonth } from '@/domain/month';
import { categoriesSentence, categoryRowTexts, comparedByLabel, type CategoryRowText } from '@/format/insights';

import { categoryLook } from './categoryLook';
import { durations, PressableScale, useReduceMotion } from './motion';
import { iconSize, minTouch, radii, spacing, useTheme, type Palette } from './theme';

/** As 001's category circles (Breakdown, the transaction list). */
const ICON_CIRCLE = 36;
const LOADING_HEIGHT = 140;
const PILL_RADIUS = 8;
/** Rows shown before "Show all" (FR-008). */
const FIRST_ROWS = 3;

type Props = {
  /** `null` while loading. */
  comparison: CategoryComparison | null;
  selected: YearMonth;
  tag: string;
};

/**
 * The Categories vs last month card (contracts/ui-screens.md, Section 2; design.md): a compact
 * list, one category per row with this month's amount and its change. Rows are not tappable; each
 * is one accessible element whose label also gives last month's amount.
 */
export function CategoryChanges({ comparison, selected, tag }: Props) {
  const { colors, type } = useTheme();
  const reduceMotion = useReduceMotion();
  // Insights remounts this card on a month change (its key), so a new month shows 3 rows again.
  const [expanded, setExpanded] = useState(false);
  const card = [
    styles.card,
    { backgroundColor: colors.surface },
    colors.tileShadow !== '' && { boxShadow: colors.tileShadow },
  ];

  if (comparison === null) {
    return (
      <View style={[card, styles.loading]}>
        <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
      </View>
    );
  }

  const sentence = categoriesSentence(comparison);
  const compared = comparedByLabel(comparison);
  const rows = categoryRowTexts(comparison, selected, tag);
  const categories = comparison.kind === 'noSpending' ? [] : comparison.rows.map((r) => r.category);
  // The biggest changes first, the rest on demand (FR-008), so the screen stays short.
  const shown = expanded ? rows : rows.slice(0, FIRST_ROWS);
  const toggle = expanded ? 'Show less' : `Show all (${rows.length})`;

  return (
    <View style={card}>
      {sentence !== null && (
        <Text style={[type.body, styles.note, { color: colors.textMuted }]}>{sentence}</Text>
      )}
      {compared !== null && (
        <Text style={[type.legend, styles.note, { color: colors.textMuted }]}>{compared}</Text>
      )}
      {shown.map((row, i) => (
        <Animated.View key={categories[i]} entering={i >= FIRST_ROWS && !reduceMotion ? FadeIn.duration(durations.fast) : undefined}>
          <Row row={row} category={categories[i]} tone={toneOf(comparison, i)} first={i === 0} />
        </Animated.View>
      ))}
      {rows.length > FIRST_ROWS && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={toggle}
          onPress={() => setExpanded((e) => !e)}
          style={[styles.toggle, { borderTopColor: colors.glassDivider }]}
        >
          <Text style={[type.bodyStrong, { color: colors.accent }]}>{toggle}</Text>
        </PressableScale>
      )}
    </View>
  );
}

type Tone = 'up' | 'down' | 'zero';

/** Spent more (including New) is `up`, less is `down` (design.md, Color, percent pills). */
function toneOf(comparison: CategoryComparison, i: number): Tone {
  if (comparison.kind !== 'changes') return 'zero';
  const change = comparison.rows[i].changeCents;
  return change > 0 ? 'up' : change < 0 ? 'down' : 'zero';
}

function pillColors(tone: Tone, colors: Palette) {
  if (tone === 'up') return { ink: colors.error, fill: colors.errorSoft };
  if (tone === 'down') return { ink: colors.income, fill: colors.incomeSoft };
  return { ink: colors.textMuted, fill: colors.insetFill };
}

function Row({
  row,
  category,
  tone,
  first,
}: {
  row: CategoryRowText;
  category: ExpenseCategory;
  tone: Tone;
  first: boolean;
}) {
  const { colors, type, scheme } = useTheme();
  const look = categoryLook('expense', category, scheme, colors);
  const pill = pillColors(tone, colors);

  return (
    <View
      accessible
      accessibilityLabel={row.accessibilityLabel}
      style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: colors.glassDivider }]}
    >
      <View style={[styles.icon, { backgroundColor: look.tint }]}>
        <Feather name={look.icon} size={iconSize.button} color={look.ink} />
      </View>
      <View style={styles.lines}>
        <View style={styles.line}>
          <Text style={[type.bodyStrong, styles.grow, { color: colors.text }]}>{row.label}</Text>
          <Text style={[type.bodyStrong, { color: colors.text }]}>{row.current}</Text>
        </View>
        {row.change !== undefined && (
          <View style={styles.line}>
            <Text style={[type.caption, styles.grow, { color: colors.textMuted }]}>{row.change}</Text>
            {row.percent !== undefined && (
              <View style={[styles.pill, { backgroundColor: pill.fill }]}>
                <Text style={[type.pill, { color: pill.ink }]}>{row.percent}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.card,
  },
  loading: { height: LOADING_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  note: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  icon: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lines: { flex: 1, gap: 2 },
  // The two parts wrap under each other when they do not fit (large text); nothing is cut.
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs },
  grow: { flexGrow: 1, flexShrink: 1 },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: PILL_RADIUS },
  toggle: { minHeight: minTouch, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1 },
});
