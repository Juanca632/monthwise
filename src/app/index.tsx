import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMonthSummary } from '@/hooks/useMonthSummary';
import { useRegion } from '@/hooks/useRegion';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { Breakdown } from '@/ui/Breakdown';
import { MonthHeader } from '@/ui/MonthHeader';
import { StateMessage } from '@/ui/StateMessage';
import { iconSize, radii, spacing, useTheme } from '@/ui/theme';
import { Totals, type TotalsContent } from '@/ui/Totals';
import { TransactionList } from '@/ui/TransactionList';

const ADD_HEIGHT = 56;
const ADD_GAP = spacing.xxl;
const OPEN_FAILED = "Couldn't open this transaction.";

// Expo inlines EXPO_PUBLIC_* at build time, so production bundles drop this branch and, with it,
// the dev tools module (contracts/ui-screens.md). A static import would keep it.
let DevTools: typeof import('@/dev/DevTools').DevTools | null = null;
if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DevTools = require('@/dev/DevTools').DevTools;
}

/** The monthly summary (contracts/ui-screens.md, Summary screen). */
export default function SummaryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tag } = useRegion();
  const { status, rows, summary, retry } = useMonthSummary();
  const router = useRouter();
  const notice = useSummaryNotice();

  // Announced once when it appears; it stays on screen until dismissed (contract, FR-025).
  useEffect(() => {
    if (notice.notice === 'open_failed') {
      AccessibilityInfo.announceForAccessibility(OPEN_FAILED);
    }
  }, [notice.notice]);

  const openTransaction = (id: number) => {
    // The banner is about an earlier attempt; opening another transaction clears it.
    notice.dismiss();
    router.push({ pathname: '/transaction/[id]', params: { id: String(id) } });
  };

  const content: TotalsContent =
    status === 'loading'
      ? { kind: 'loading' }
      : status === 'error'
        ? { kind: 'error', onRetry: retry }
        : {
            kind: 'values',
            incomeCents: summary.incomeCents,
            expenseCents: summary.expenseCents,
            balanceCents: summary.balanceCents,
          };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TransactionList
        rows={rows}
        tag={tag}
        header={
          <View style={{ paddingTop: spacing.sm + insets.top }}>
            <Totals
              tag={tag}
              content={content}
              header={(tone) => <MonthHeader tone={tone} />}
            />
            {notice.notice === 'open_failed' && (
              <StateMessage
                variant="banner"
                message={OPEN_FAILED}
                action={{ label: 'Dismiss', onPress: notice.dismiss }}
              />
            )}
            {/* Ready months only: an empty month shows its own line instead (FR-022). */}
            {status === 'ready' && rows.length > 0 && (
              <Breakdown items={summary.breakdown} tag={tag} />
            )}
          </View>
        }
        // Loading and error show only the card; an empty month gets its own line (FR-022).
        empty={
          status === 'ready' ? (
            <StateMessage
              variant="card"
              icon="credit-card"
              message="No transactions this month yet."
              helper="Tap Add to record an income or expense."
            />
          ) : null
        }
        // Shown in every state, so the simulated storage error can be turned off again.
        footer={DevTools ? <DevTools onChanged={retry} /> : null}
        onPressItem={openTransaction}
        bottomPadding={ADD_HEIGHT + ADD_GAP + spacing.md + insets.bottom}
      />
      <AddButton bottom={ADD_GAP + insets.bottom} />
    </View>
  );
}

/** Always visible, whatever the summary's state (FR-002). */
function AddButton({ bottom }: { bottom: number }) {
  const { colors, type, scheme } = useTheme();
  const router = useRouter();
  return (
    // The shadow sits on a wrapper that does not clip; the button clips its ripple (design.md).
    <View
      pointerEvents="box-none"
      style={[styles.addWrapper, { bottom }, scheme === 'light' && styles.addShadow]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => router.push('/transaction/new')}
        android_ripple={{ color: colors.rippleOnAccent }}
        style={[styles.addButton, { backgroundColor: colors.accent }]}
      >
        <Feather name="plus" size={iconSize.button} color={colors.onAccent} />
        <Text style={[type.button, { color: colors.onAccent }]}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  addWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: radii.full,
  },
  addShadow: { boxShadow: '0 6px 20px rgba(47,91,234,0.28)' },
  addButton: {
    minHeight: ADD_HEIGHT,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
});
