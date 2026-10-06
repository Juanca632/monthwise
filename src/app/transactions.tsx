import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monthTitle } from '@/format/date';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { useRegion } from '@/hooks/useRegion';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { BehindSheet } from '@/ui/BehindSheet';
import { ShapePressable } from '@/ui/glass';
import { PressableScale } from '@/ui/motion';
import { useRowChanges } from '@/ui/RowMotion';
import { StateMessage } from '@/ui/StateMessage';
import { iconSize, minTouch, radii, spacing, useTheme } from '@/ui/theme';
import { TransactionList } from '@/ui/TransactionList';

const OPEN_FAILED = "Couldn't open this transaction.";

/** Every transaction of the selected month, by day (contracts/ui-screens.md, All transactions). */
export default function AllTransactionsScreen() {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tag } = useRegion();
  const { selected } = useSelectedMonth();
  const { status, rows, retry } = useMonthSummary();
  const notice = useSummaryNotice();
  const changes = useRowChanges(rows, status, notice.lastChange);

  const openTransaction = (id: number) => {
    notice.dismiss();
    router.push({ pathname: '/transaction/[id]', params: { id: String(id) } });
  };

  const header = (
    <View style={{ paddingTop: spacing.xs + insets.top }}>
      <View style={styles.header}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          android_ripple={{ color: colors.ripple, borderless: true, radius: minTouch / 2 }}
          style={[styles.back, { backgroundColor: colors.surface }]}
        >
          <Feather name="chevron-left" size={iconSize.button} color={colors.text} />
        </PressableScale>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={[type.heading, { color: colors.text }]}>
            Transactions
          </Text>
          <Text style={[type.label, { color: colors.textMuted }]}>{monthTitle(selected)}</Text>
        </View>
      </View>
      {notice.notice === 'open_failed' && (
        <StateMessage
          variant="banner"
          message={OPEN_FAILED}
          action={{ label: 'Dismiss', onPress: notice.dismiss }}
        />
      )}
      <View style={styles.gap} />
    </View>
  );

  const state =
    status === 'loading' ? (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} size="large" />
      </View>
    ) : status === 'error' ? (
      <View style={styles.centered}>
        <Text style={[type.label, { color: colors.textMuted }]}>Couldn&apos;t load your data.</Text>
        <ShapePressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={retry}
          style={[styles.retry, { backgroundColor: colors.surface, borderColor: colors.surface }]}
        >
          <Text style={[type.bodyStrong, { color: colors.text }]}>Try again</Text>
        </ShapePressable>
      </View>
    ) : (
      <StateMessage
        variant="card"
        icon="credit-card"
        message="No transactions this month yet."
        helper="Tap Add to record an income or expense."
      />
    );

  return (
    <BehindSheet testID="all-transactions">
      <TransactionList
        rows={changes.rows}
        changeFor={changes.changeFor}
        tag={tag}
        header={header}
        empty={state}
        onPressItem={openTransaction}
        bottomPadding={spacing.xxl + insets.bottom}
      />
    </BehindSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  back: {
    width: minTouch,
    height: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  gap: { height: spacing.md },
  centered: { paddingTop: spacing.xxxl, alignItems: 'center', gap: spacing.md },
  retry: {
    minHeight: minTouch,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
