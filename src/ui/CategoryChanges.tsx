import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ExpenseCategory } from '@/domain/categories';
import type { CategoryComparison } from '@/domain/categoryChanges';
import type { YearMonth } from '@/domain/month';
import {
  categoriesSentence,
  categoryColumnTitles,
  categoryRowTexts,
  comparedByLabel,
  type CategoryRowText,
} from '@/format/insights';

import { categoryLook } from './categoryLook';
import { radii, spacing, useTheme, type Palette } from './theme';

/** The three-column table holds amounts up to this long at 360 dp (design.md, Long amounts). */
const MAX_COLUMN_CHARS = 10;
const DOT = 8;
/** Line 2 and the column titles line up with the label, after the dot and its gap. */
const INDENT = DOT + spacing.xs;
const LOADING_HEIGHT = 140;
const PILL_RADIUS = 8;

type Props = {
  /** `null` while loading. */
  comparison: CategoryComparison | null;
  selected: YearMonth;
  tag: string;
};

/**
 * The Categories vs last month card (contracts/ui-screens.md, Section 2; design.md). Rows are not
 * tappable; each is one accessible element with the whole row in its label.
 */
export function CategoryChanges({ comparison, selected, tag }: Props) {
  const { colors, type, isLargeText } = useTheme();
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
  if (comparison.kind === 'noSpending') {
    return (
      <View style={card}>
        <Text style={[type.body, { color: colors.textMuted }]}>{sentence}</Text>
      </View>
    );
  }

  const titles = categoryColumnTitles(comparison, selected);
  const rows = categoryRowTexts(comparison, selected, tag);
  const categories = comparison.rows.map((r) => r.category);
  const longest = Math.max(
    ...rows.flatMap((r) => [r.current, r.previous ?? '', r.change ?? ''].map((t) => t.length)),
  );
  // Amounts are never cut: past the columns' room, or with large text, each value goes under its
  // own title instead (design.md, Large text).
  const stacked = isLargeText || longest > MAX_COLUMN_CHARS;
  const compared = comparedByLabel(comparison);

  return (
    <View style={card}>
      {sentence !== null && <Text style={[type.body, { color: colors.textMuted }]}>{sentence}</Text>}
      {compared !== null && <Text style={[type.legend, { color: colors.textMuted }]}>{compared}</Text>}
      {!stacked && (
        <View style={[styles.columns, styles.titles]}>
          {titles.map((title, i) => (
            <Text key={title} style={[type.legend, columnStyle(i), { color: colors.textMuted }]}>
              {title}
            </Text>
          ))}
        </View>
      )}
      {rows.map((row, i) => (
        <Row
          key={categories[i]}
          row={row}
          category={categories[i]}
          titles={titles}
          stacked={stacked}
          tone={toneOf(comparison, i)}
        />
      ))}
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

/** The 1 : 1 : 1.3 columns (design.md, Categories). */
const columnStyle = (i: number) => ({ flex: i === 2 ? 1.3 : 1 });

function Row({
  row,
  category,
  titles,
  stacked,
  tone,
}: {
  row: CategoryRowText;
  category: ExpenseCategory;
  titles: string[];
  stacked: boolean;
  tone: Tone;
}) {
  const { colors, type, scheme } = useTheme();
  const dot = categoryLook('expense', category, scheme, colors).ink;
  const pill = pillColors(tone, colors);

  const change = row.change !== undefined && (
    <View style={styles.change}>
      <Text style={[type.bodyStrong, { color: colors.text }]}>{row.change}</Text>
      <View style={[styles.pill, { backgroundColor: pill.fill }]}>
        <Text style={[type.pill, { color: pill.ink }]}>{row.percent}</Text>
      </View>
    </View>
  );
  const values = [
    <Text key="current" style={[type.body, { color: colors.text }]}>
      {row.current}
    </Text>,
    ...(row.previous !== undefined
      ? [
          <Text key="previous" style={[type.body, { color: colors.textMuted }]}>
            {row.previous}
          </Text>,
          <View key="change">{change}</View>,
        ]
      : []),
  ];

  return (
    <View
      accessible
      accessibilityLabel={row.accessibilityLabel}
      style={[styles.row, { borderTopColor: colors.glassDivider }]}
    >
      <View style={styles.name}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[type.bodyStrong, { color: colors.text }]}>{row.label}</Text>
      </View>
      {stacked ? (
        <View style={styles.stack}>
          {values.map((value, i) => (
            <View key={titles[i]}>
              <Text style={[type.legend, { color: colors.textMuted }]}>{titles[i]}</Text>
              {value}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.columns}>
          {values.map((value, i) => (
            <View key={titles[i]} style={columnStyle(i)}>
              {value}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  loading: { height: LOADING_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  titles: { marginBottom: -spacing.xxs },
  columns: { flexDirection: 'row', gap: spacing.xs, paddingLeft: INDENT },
  row: { paddingTop: spacing.sm, borderTopWidth: 1, gap: spacing.xxs },
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  stack: { paddingLeft: INDENT, gap: spacing.xxs },
  change: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: PILL_RADIUS },
});
