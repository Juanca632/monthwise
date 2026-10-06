import type { ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/data/transactionRepository';
import { labelFor, type CategoryKey } from '@/domain/categories';
import { formatNumericDate, formatSpokenDate } from '@/format/date';
import { formatMoney, formatSignedMoney } from '@/format/money';

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

/**
 * The month's transactions (design.md, Summary screen item 3). A FlatList draws only the visible
 * rows, which keeps a 1,000-transaction month fast (SC-004); the header scrolls with it.
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
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => String(row.id)}
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
      renderItem={({ item, index }) => {
        // Only the first screen's rows can animate (SC-004). Every row keeps the same wrapper,
        // so one crossing index 8 after a delete is not remounted.
        return (
          <Appear on={['entrance', 'month']} slot={2 + index} enabled={index < MAX_ANIMATED_ROWS}>
            <RowMotion change={changeFor?.(item.id) ?? null}>
              <TransactionRow
                row={item}
                tag={tag}
                first={index === 0}
                last={index === rows.length - 1}
                onPress={onPressItem}
              />
            </RowMotion>
          </Appear>
        );
      }}
    />
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
  const caption = [row.note, formatNumericDate(row.date, tag)].filter(Boolean).join(' · ');
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
        <Text style={[type.caption, { color: colors.textMuted }]}>{caption}</Text>
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
