import { useMemo, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/data/transactionRepository';
import { labelFor, type CategoryKey } from '@/domain/categories';
import { groupByDay } from '@/domain/days';
import type { IsoDate } from '@/domain/month';
import { dayName, formatSpokenDate, spokenDayName } from '@/format/date';
import { formatMoney, formatSignedMoney, spokenMoney } from '@/format/money';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

import { Appear, MAX_ANIMATED_ROWS } from './Appear';
import { PressableScale } from './motion';
import { RowMotion, type RowChange } from './RowMotion';
import { insetHighlight, radii, spacing, useTheme } from './theme';

type Props = {
  rows: readonly Transaction[];
  tag: string;
  /** Everything above the list (balance card, banner, breakdown); scrolls with it. */
  header: ReactElement;
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

/** Rows grouped by day (FR-017), flattened so one FlatList still draws only what is visible. */
function itemsOf(rows: readonly Transaction[]): Item[] {
  const items: Item[] = [];
  groupByDay(rows).forEach((day, d) => {
    items.push({ kind: 'day', key: `day-${day.date}`, date: day.date, netCents: day.netCents, first: d === 0 });
    day.rows.forEach((row, i) =>
      items.push({
        kind: 'row',
        key: String(row.id),
        row,
        first: i === 0,
        last: i === day.rows.length - 1,
      }),
    );
  });
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
  empty,
  footer,
  onPressItem,
  changeFor,
  bottomPadding,
}: Props) {
  const { colors, type } = useTheme();
  const items = useMemo(() => itemsOf(rows), [rows]);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={
        <>
          {header}
          {rows.length > 0 && (
            <Text style={[type.section, styles.sectionTitle, { color: colors.text }]}>
              Transactions
            </Text>
          )}
        </>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      renderItem={({ item, index }) => (
        // Only the first screen's items can animate (SC-004). Every item keeps the same wrapper,
        // so one crossing index 8 after a delete is not remounted.
        <Appear on={['entrance', 'month']} slot={2 + index} enabled={index < MAX_ANIMATED_ROWS}>
          {item.kind === 'day' ? (
            <DayHeader date={item.date} netCents={item.netCents} first={item.first} tag={tag} />
          ) : (
            <RowMotion
              change={changeFor?.(item.row.id) ?? null}
              flashShape={[styles.flashShape, item.first && styles.firstCard, item.last && styles.lastCard]}
            >
              <TransactionRow
                row={item.row}
                tag={tag}
                first={item.first}
                last={item.last}
                onPress={onPressItem}
              />
            </RowMotion>
          )}
        </Appear>
      )}
    />
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
      <Text style={[type.labelStrong, { color: colors.text }]}>
        {net}
      </Text>
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
  const { colors, type, isLargeText } = useTheme();
  // Stored categories always match their type (database CHECK).
  const label = labelFor(row.type, row.category as CategoryKey);
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
        { borderBottomColor: last ? 'transparent' : colors.glassDivider },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.avatar,
          { backgroundColor: income ? colors.incomeSoft : colors.glassAvatar },
        ]}
      >
        <Text style={[type.avatarInitial, { color: income ? colors.income : colors.textMuted }]}>
          {label[0]}
        </Text>
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
          backgroundColor: colors.glassFill,
          borderColor: colors.glassBorder,
          borderTopColor: first ? colors.glassBorder : 'transparent',
          borderBottomColor: last ? colors.glassBorder : 'transparent',
        },
      ]}
    >
      {first && (
        <View
          pointerEvents="none"
          style={[styles.highlight, { boxShadow: insetHighlight(colors.glassHighlight) }]}
        />
      )}
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
  sectionTitle: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
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
  highlight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radii.card - 1,
    borderTopRightRadius: radii.card - 1,
  },
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
