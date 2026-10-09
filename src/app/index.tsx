import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compareMonths } from '@/domain/month';
import type { Pace } from '@/domain/pace';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { useRegion } from '@/hooks/useRegion';
import { haptics } from '@/lib/haptics';
import { handOffPace } from '@/state/handedPace';
import { handOffTransaction } from '@/state/openedTransaction';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { useSheetOpener } from '@/state/SheetTransitionContext';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { Appear, SummaryMotionProvider, type SummaryMotion } from '@/ui/Appear';
import { Breakdown } from '@/ui/Breakdown';
import { BehindSheet } from '@/ui/BehindSheet';
import { CardTitle } from '@/ui/CardTitle';
import { MonthControl } from '@/ui/MonthControl';
import { PaceCard } from '@/ui/PaceCard';
import { useRowChanges } from '@/ui/RowMotion';
import { StateMessage } from '@/ui/StateMessage';
import { spacing } from '@/ui/theme';
import { Totals, type TotalsContent } from '@/ui/Totals';
import { AddButton, SeeAll, TransactionList } from '@/ui/TransactionList';

/** The summary shows this many of the month's most recent transactions (FR-017; 3 like Revolut). */
const PREVIEW_ROWS = 3;
const OPEN_FAILED = "Couldn't open this transaction.";

// Expo inlines EXPO_PUBLIC_* at build time, so production bundles drop this branch and, with it,
// the dev tools module (contracts/ui-screens.md). A static import would keep it.
let DevTools: typeof import('@/dev/DevTools').DevTools | null = null;
if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DevTools = require('@/dev/DevTools').DevTools;
}

/** The clock the summary's entrance and month-change motion run on (ui/Appear.tsx). */
function useSummaryMotion(): SummaryMotion {
  const { selected } = useSelectedMonth();
  // The summary stays mounted under the forms, so its mount is the cold start.
  const [entranceStart] = useState(() => Date.now());
  const [monthChange, setMonthChange] = useState<SummaryMotion['monthChange']>(null);
  const shown = useRef(selected);
  useEffect(() => {
    const from = shown.current;
    shown.current = selected;
    if (from === selected) return;
    // Recorded right after the render that changes the month, which shows it loading; the new
    // month's content mounts later, when its query returns, and reads this. An earlier month
    // comes in from the left, a later one from the right (002 design.md, Motion).
    setMonthChange({ at: Date.now(), from: compareMonths(selected, from) < 0 ? 'left' : 'right' });
  }, [selected]);
  return useMemo(() => ({ entranceStart, monthChange }), [entranceStart, monthChange]);
}

/** The monthly summary (contracts/ui-screens.md, Summary screen). */
export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { tag } = useRegion();
  const notice = useSummaryNotice();
  const sheetOpener = useSheetOpener();
  const { status, rows, summary, pace, retry } = useMonthSummary();
  const router = useRouter();
  const motion = useSummaryMotion();
  // The totals come from the stored rows; the list may still show a deleted row leaving.
  const changes = useRowChanges(rows, status, notice.lastChange);

  // Announced once when it appears; it stays on screen until dismissed (contract, FR-025).
  useEffect(() => {
    if (notice.notice === 'open_failed') {
      AccessibilityInfo.announceForAccessibility(OPEN_FAILED);
    }
  }, [notice.notice]);

  const openTransaction = (id: number) => {
    // The banner is about an earlier attempt; opening another transaction clears it.
    notice.dismiss();
    handOffTransaction(rows.find((r) => r.id === id));
    sheetOpener.set('summary');
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

  // The card's lines draw in with the summary's first data, never after a month change; a
  // same-month reload keeps the card mounted, so it never draws in again (design.md, Motion).
  const revealPace = motion.monthChange === null;

  const openInsights = (shown: Pace) => {
    handOffPace(shown, performance.now());
    router.push('/insights');
  };

  const addTransaction = () => {
    haptics.add();
    sheetOpener.set('summary');
    router.push('/transaction/new');
  };

  return (
    <SummaryMotionProvider value={motion}>
      <BehindSheet screen="summary" testID="summary-content">
        <TransactionList
          rows={changes.rows}
          changeFor={changes.changeFor}
          tag={tag}
          header={
              <View style={{ paddingTop: spacing.sm + insets.top }}>
              {/* The month is the screen's title, as on Insights (002 design.md, Month control). */}
              <View style={styles.monthRow}>
                <MonthControl />
              </View>
              <Appear on={['entrance']} slot={0}>
                <Totals tag={tag} content={content} />
              </Appear>
              {notice.notice === 'open_failed' && (
                <StateMessage
                  variant="banner"
                  message={OPEN_FAILED}
                  action={{ label: 'Dismiss', onPress: notice.dismiss }}
                />
              )}
              {/* Hidden on error: the balance card's own error covers it (002 contract). */}
              {status === 'loading' && (
                <Appear on={['entrance']} slot={1}>
                  <PaceCard tag={tag} content={{ kind: 'loading' }} />
                </Appear>
              )}
              {status === 'ready' && pace && (
                <Appear on={['entrance', 'month']} slot={1}>
                  <PaceCard
                    tag={tag}
                    content={{ kind: 'ready', pace, onPress: () => openInsights(pace), reveal: revealPace }}
                  />
                </Appear>
              )}
              {/* Ready months only: an empty month shows its own line instead (FR-022). */}
              {status === 'ready' && rows.length > 0 && (
                <Appear on={['entrance', 'month']} slot={2}>
                  <Breakdown items={summary.breakdown} tag={tag} />
                </Appear>
              )}
            </View>
          }
          // A small, quiet title with Add on its right, in every state (FR-002).
          title={<CardTitle title="Transactions" action={<AddButton onAdd={addTransaction} />} />}
          // The 3 most recent; the rest are one tap away (FR-017).
          limit={PREVIEW_ROWS}
          // Loading and error show only the card; an empty month gets its own line (FR-022).
          empty={
            status === 'ready' ? (
              <Appear on={['entrance', 'month']} slot={2}>
                <StateMessage
                  variant="card"
                  icon="credit-card"
                  message="No transactions this month yet."
                  helper="Tap Add to record an income or expense."
                />
              </Appear>
            ) : null
          }
          footer={
            <>
              {rows.length > PREVIEW_ROWS && <SeeAll onPress={() => router.push('/transactions')} />}
              {/* Shown in every state, so the simulated storage error can be turned off again. */}
              {DevTools && <DevTools onChanged={retry} />}
            </>
          }
          onPressItem={openTransaction}
          bottomPadding={spacing.xxl + insets.bottom}
        />
      </BehindSheet>
    </SummaryMotionProvider>
  );
}

const styles = StyleSheet.create({
  monthRow: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
});
