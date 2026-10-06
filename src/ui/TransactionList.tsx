import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/data/transactionRepository';
import { labelFor, type CategoryKey } from '@/domain/categories';
import { formatNumericDate, formatSpokenDate } from '@/format/date';
import { formatMoney, formatSignedMoney } from '@/format/money';

import { radii, spacing, useTheme } from './theme';

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
  /** Room under the last row so the floating Add button never covers it. */
  bottomPadding: number;
};

/**
 * The month's transactions (design.md, Summary screen item 3). A FlatList draws only the visible
 * rows, which keeps a 1,000-transaction month fast (SC-004); the header scrolls with it.
 */
export function TransactionList({ rows, tag, header, empty, footer, onPressItem, bottomPadding }: Props) {
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
      renderItem={({ item, index }) => (
        <TransactionRow
          row={item}
          tag={tag}
          first={index === 0}
          last={index === rows.length - 1}
          onPress={onPressItem}
        />
      )}
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
        !last && { borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[styles.avatar, { backgroundColor: income ? colors.incomeSoft : colors.avatar }]}
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

  // The card is drawn row by row, so only the outer rows round their corners.
  const cardStyle = [
    styles.row,
    { backgroundColor: colors.surface },
    first && styles.firstRow,
    last && styles.lastRow,
  ];

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} style={cardStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => onPress(row.id)}
      android_ripple={{ color: colors.ripple }}
      style={[...cardStyle, styles.clip]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  row: { marginHorizontal: spacing.md, paddingHorizontal: spacing.md },
  firstRow: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingTop: spacing.xxs,
  },
  lastRow: {
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    paddingBottom: spacing.xxs,
  },
  clip: { overflow: 'hidden' },
  rowContent: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
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
