import { memo, useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import type { Transaction } from '@/data/transactionRepository';
import { labelFor, type CategoryKey } from '@/domain/categories';
import { groupByDay } from '@/domain/days';
import type { IsoDate } from '@/domain/month';
import { dayName, formatSpokenDate, spokenDayName } from '@/format/date';
import { formatMoney, formatSignedMoney, spokenMoney } from '@/format/money';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

import { Appear, MAX_ANIMATED_ROWS } from './Appear';
import { durations, easeOut, PressableScale, useReduceMotion } from './motion';
import { RowMotion, type RowChange } from './RowMotion';
import { categoryLook } from './categoryLook';
import { ShapePressable } from './glass';
import { iconSize, insetHighlight, minTouch, radii, spacing, useTheme } from './theme';

type Props = {
  rows: readonly Transaction[];
  tag: string;
  /** Everything above the list (balance card, banner, breakdown); scrolls with it. */
  header: ReactElement;
  /** The "Transactions" title row, shown in every state; none on the all-transactions page. */
  title?: ReactElement | null;
  /** Shows at most this many rows (the summary's preview); all by default. */
  limit?: number;
  /** Shown instead of the list when there are no rows. */
  empty?: ReactElement | null;
  /** Below the last row; also shown when there are no rows. */
  footer?: ReactElement | null;
  onPressItem?(id: number): void;
  /** The one row a save or delete changed, to animate it. */
  changeFor?(id: number): RowChange | null;
  /** Room under the last row so the floating Add button never covers it. */
  bottomPadding: number;
};

/** One line of the list: a day's header, or a row in its day's card. */
type Item =
  | { kind: 'day'; key: string; date: IsoDate; netCents: number; first: boolean }
  | { kind: 'row'; key: string; row: Transaction; first: boolean; last: boolean };

const rowShift = LinearTransition.duration(durations.rowShift).easing(easeOut);

/** Rows grouped by day (FR-017), flattened so one FlatList still draws only what is visible. */
function itemsOf(rows: readonly Transaction[], limit: number): Item[] {
  const items: Item[] = [];
  let left = limit;
  for (const [d, day] of groupByDay(rows).entries()) {
    if (left === 0) break;
    // A day cut by the limit keeps its whole net, so its total never misleads (FR-017).
    const shown = day.rows.slice(0, left);
    left -= shown.length;
    items.push({ kind: 'day', key: `day-${day.date}`, date: day.date, netCents: day.netCents, first: d === 0 });
    shown.forEach((row, i) =>
      items.push({
        kind: 'row',
        key: String(row.id),
        row,
        first: i === 0,
        last: i === shown.length - 1,
      }),
    );
  }
  return items;
}

/**
 * The month's transactions by day (design.md, Summary screen item 3). A FlatList draws only the
 * visible items, which keeps a 1,000-transaction month fast (SC-004); the header scrolls with it.
 */
export function TransactionList({
  rows,
  tag,
  header,
  title = null,
  limit = Infinity,
  empty,
  footer,
  onPressItem,
  changeFor,
  bottomPadding,
}: Props) {
  const items = useMemo(() => itemsOf(rows, limit), [rows, limit]);
  const reduceMotion = useReduceMotion();

  // One stable press handler, so a screen's new callback on each render does not redraw rows.
  const onPressRef = useRef(onPressItem);
  useEffect(() => {
    onPressRef.current = onPressItem;
  }, [onPressItem]);
  const pressItem = useCallback((id: number) => onPressRef.current?.(id), []);

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <ListCell
        item={item}
        index={index}
        tag={tag}
        change={item.kind === 'row' ? (changeFor?.(item.row.id) ?? null) : null}
        onPress={pressItem}
      />
    ),
    [tag, changeFor, pressItem],
  );

  return (
    <Animated.FlatList
      data={items}
      keyExtractor={(item) => item.key}
      // A month can hold 1,000 transactions: mount about a screen at first and a few screens
      // around the visible one as it scrolls, instead of FlatList's default 21 screens, so opening
      // a form or deleting never competes with mounting hundreds of rows (fine-tuning 2026-10-07).
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={5}
      // When a row comes or goes, the others glide to their places natively; under reduce motion
      // they jump (fine-tuning 2026-10-07).
      itemLayoutAnimation={reduceMotion ? undefined : rowShift}
      ListHeaderComponent={
        <>
          {header}
          {title}
        </>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      renderItem={renderItem}
    />
  );
}

type CellProps = {
  item: Item;
  index: number;
  tag: string;
  change: RowChange | null;
  onPress(id: number): void;
};

/**
 * One list item. Memoized by content: a reload brings new row objects for the whole month, but
 * only the items whose values, place in their day card or change differ are drawn again.
 */
const ListCell = memo(function ListCell({ item, index, tag, change, onPress }: CellProps) {
  return (
    // Only the first screen's items can animate (SC-004). Every item keeps the same wrapper, so
    // one crossing index 8 after a delete is not remounted.
    <Appear on={['entrance', 'month']} slot={3 + index} enabled={index < MAX_ANIMATED_ROWS}>
      {item.kind === 'day' ? (
        <DayHeader date={item.date} netCents={item.netCents} first={item.first} tag={tag} />
      ) : (
        <RowMotion
          change={change}
          flashShape={[styles.flashShape, item.first && styles.firstCard, item.last && styles.lastCard]}
        >
          <TransactionRow row={item.row} tag={tag} first={item.first} last={item.last} onPress={onPress} />
        </RowMotion>
      )}
    </Appear>
  );
}, sameCell);

// `index` is left out: Appear reads it only at mount, so rows that move up after a delete are
// not drawn again.
function sameCell(a: CellProps, b: CellProps): boolean {
  if (a.tag !== b.tag || a.change !== b.change || a.onPress !== b.onPress) {
    return false;
  }
  const x = a.item;
  const y = b.item;
  if (x.kind === 'day' || y.kind === 'day') {
    return (
      x.kind === 'day' &&
      y.kind === 'day' &&
      x.date === y.date &&
      x.netCents === y.netCents &&
      x.first === y.first
    );
  }
  const r = x.row;
  const s = y.row;
  return (
    x.first === y.first &&
    x.last === y.last &&
    r.id === s.id &&
    r.type === s.type &&
    r.amountCents === s.amountCents &&
    r.date === s.date &&
    r.category === s.category &&
    r.note === s.note
  );
}

/** The "Transactions" title with **Add** on its right (FR-002); shown in every summary state. */
export function TransactionsTitle({ onAdd }: { onAdd(): void }) {
  const { colors, type } = useTheme();
  return (
    <View style={styles.titleRow}>
      <Text accessibilityRole="header" style={[type.heading, styles.flex, { color: colors.text }]}>
        Transactions
      </Text>
      {/* A plain glass pill: translucent fill, bright rim and top highlight, no color of its own
          (fine-tuning 2026-10-06). */}
      {/* The soft shadow sits on a wrapper that does not clip; the pill clips its overlay. */}
      <View style={[styles.addShadow, { boxShadow: colors.glassShadow }]}>
        <ShapePressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={onAdd}
          style={[
            styles.addButton,
            {
              backgroundColor: colors.glassFillStrong,
              borderColor: colors.glassBorderStrong,
              boxShadow: insetHighlight(colors.glassHighlight),
            },
          ]}
        >
          <Feather name="plus" size={iconSize.circle} color={colors.text} />
          <Text style={[type.button, { color: colors.text }]}>Add</Text>
        </ShapePressable>
      </View>
    </View>
  );
}

/** Under the summary's preview when the month has more (FR-017). */
export function SeeAll({ onPress }: { onPress(): void }) {
  const { colors, type } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="See all transactions"
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      style={styles.seeAll}
    >
      <Text style={[type.labelStrong, { color: colors.accent }]}>See all</Text>
      <Feather name="chevron-right" size={iconSize.circle} color={colors.accent} />
    </PressableScale>
  );
}

/** A day's header: its name and net (design.md, Summary screen item 3). */
function DayHeader({ date, netCents, first, tag }: { date: IsoDate; netCents: number; first: boolean; tag: string }) {
  const { colors, type, isLargeText } = useTheme();
  const { today } = useSelectedMonth();
  // `+` above zero, minus below, no sign at zero (FR-017).
  const net =
    netCents === 0
      ? formatMoney(0, tag)
      : formatSignedMoney(Math.abs(netCents), netCents > 0 ? 'income' : 'expense', tag);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${spokenDayName(date, today)}, net ${spokenMoney(netCents, tag)}`}
      style={[styles.dayHeader, first && styles.firstDayHeader, isLargeText && styles.dayHeaderStacked]}
    >
      {/* `text` for both: headers scroll over the ambient glow, where muted text and the income
          color drop below 4.5:1 in light; the net's sign carries its meaning (design.md). */}
      <Text style={[type.label, { color: colors.text }]}>{dayName(date, today)}</Text>
      <Text style={[type.labelStrong, { color: colors.text }]}>{net}</Text>
    </View>
  );
}

type RowProps = {
  row: Transaction;
  tag: string;
  first: boolean;
  last: boolean;
  onPress?(id: number): void;
};

function TransactionRow({ row, tag, first, last, onPress }: RowProps) {
  const { colors, type, isLargeText, scheme } = useTheme();
  // Stored categories always match their type (database CHECK).
  const label = labelFor(row.type, row.category as CategoryKey);
  const look = categoryLook(row.type, row.category as CategoryKey, scheme, colors);
  const income = row.type === 'income';
  const spoken = [
    income ? 'Income' : 'Expense',
    label,
    formatMoney(row.amountCents, tag),
    formatSpokenDate(row.date),
    ...(row.note ? [`note: ${row.note}`] : []),
  ].join(', ');

  const amount = (
    <Text style={[type.bodyStrong, { color: income ? colors.income : colors.text }]}>
      {formatSignedMoney(row.amountCents, row.type, tag)}
    </Text>
  );

  const content = (
    <View
      style={[
        styles.rowContent,
        // Only the color changes: borders are never removed at runtime (design.md).
        { borderBottomColor: last ? 'transparent' : colors.divider },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.avatar,
          // The category's own color and icon, instead of its initial (fine-tuning 2026-10-06).
          { backgroundColor: look.tint },
        ]}
      >
        <Feather name={look.icon} size={iconSize.button} color={look.ink} />
      </View>
      <View style={styles.text}>
        <Text style={[type.bodyStrong, { color: colors.text }]}>{label}</Text>
        {/* The date is the day header's; only the note shows here. */}
        {row.note ? <Text style={[type.caption, { color: colors.textMuted }]}>{row.note}</Text> : null}
        {/* Large text: the amount moves under the label, left-aligned (design.md). */}
        {isLargeText && amount}
      </View>
      {!isLargeText && amount}
    </View>
  );

  const rowStyle = [styles.row, first && styles.firstRow, last && styles.lastRow];

  return (
    // The glass card is drawn row by row: every row has the fill and a 1 dp border on all sides,
    // with the top and bottom borders transparent inside the card, so the outer rows only change
    // a color when rows are added or removed. Only the outer rows round their corners, and this
    // view clips the row's ripple to them (design.md, Touch feedback).
    <View
      style={[
        styles.card,
        first && styles.firstCard,
        last && styles.lastCard,
        {
          // Content, not glass: a solid surface (Liquid Glass is for the floating layer only).
          backgroundColor: colors.surface,
          borderColor: colors.surface,
          borderTopColor: first ? colors.surface : 'transparent',
          borderBottomColor: last ? colors.surface : 'transparent',
        },
      ]}
    >
      {onPress ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={spoken}
          onPress={() => onPress(row.id)}
          android_ripple={{ color: colors.ripple }}
          style={rowStyle}
        >
          {content}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={spoken} style={rowStyle}>
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 32 dp of air above, like the other section titles; Add sits on the right.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
  },
  flex: { flex: 1 },
  addShadow: { borderRadius: radii.full },
  addButton: {
    minHeight: minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAll: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: minTouch,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  // No outer shadow: a shadow per row would show through the translucent rows above it, and a
  // FlatList has no single view around its rows to carry one (design.md, Components).
  card: { marginHorizontal: spacing.md, borderWidth: 1, overflow: 'hidden' },
  // The row's card, for the edited-row flash drawn over it.
  flashShape: { left: spacing.md, right: spacing.md },
  // Like section titles; the first day sits right under the "Transactions" title.
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  firstDayHeader: { paddingTop: 0 },
  // Large text: the net moves under the day, left-aligned (design.md).
  dayHeaderStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  firstCard: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  lastCard: { borderBottomLeftRadius: radii.card, borderBottomRightRadius: radii.card },
  row: { paddingHorizontal: spacing.md },
  firstRow: { paddingTop: spacing.xxs },
  lastRow: { paddingBottom: spacing.xxs },
  rowContent: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xxs },
});
