import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { YearMonth } from '@/domain/month';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { useRegion } from '@/hooks/useRegion';
import { haptics } from '@/lib/haptics';
import { handOffTransaction } from '@/state/openedTransaction';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { useSheetOpener } from '@/state/SheetTransitionContext';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { Appear, SummaryMotionProvider, type SummaryMotion } from '@/ui/Appear';
import { Breakdown } from '@/ui/Breakdown';
import { BehindSheet } from '@/ui/BehindSheet';
import { MonthHeader } from '@/ui/MonthHeader';
import { useRowChanges } from '@/ui/RowMotion';
import { StateMessage } from '@/ui/StateMessage';
import { spacing } from '@/ui/theme';
import { Totals, type TotalsContent } from '@/ui/Totals';
import { SeeAll, TransactionList, TransactionsTitle } from '@/ui/TransactionList';

/** The summary shows this many of the month's most recent transactions (FR-017). */
const PREVIEW_ROWS = 5;
const OPEN_FAILED = "Couldn't open this transaction.";

// Expo inlines EXPO_PUBLIC_* at build time, so production bundles drop this branch and, with it,
// the dev tools module (contracts/ui-screens.md). A static import would keep it.
let DevTools: typeof import('@/dev/DevTools').DevTools | null = null;
if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DevTools = require('@/dev/DevTools').DevTools;
}

const monthIndex = (m: YearMonth) => m.year * 12 + m.month;

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
    // means the left (previous) button, so its content comes in from the left.
    setMonthChange({ at: Date.now(), from: monthIndex(selected) < monthIndex(from) ? 'left' : 'right' });
  }, [selected]);
  return useMemo(() => ({ entranceStart, monthChange }), [entranceStart, monthChange]);
}

/** The monthly summary (contracts/ui-screens.md, Summary screen). */
export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { tag } = useRegion();
  const notice = useSummaryNotice();
  const sheetOpener = useSheetOpener();
  const { status, rows, summary, retry } = useMonthSummary();
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
              <Appear on={['entrance']} slot={0}>
                <Totals tag={tag} content={content} header={(tone) => <MonthHeader tone={tone} />} />
              </Appear>
              {notice.notice === 'open_failed' && (
                <StateMessage
                  variant="banner"
                  message={OPEN_FAILED}
                  action={{ label: 'Dismiss', onPress: notice.dismiss }}
                />
              )}
              {/* Ready months only: an empty month shows its own line instead (FR-022). */}
              {status === 'ready' && rows.length > 0 && (
                <Appear on={['entrance', 'month']} slot={1}>
                  <Breakdown items={summary.breakdown} tag={tag} />
                </Appear>
              )}
            </View>
          }
          // In every state, with Add (FR-002).
          title={<TransactionsTitle onAdd={addTransaction} />}
          // The 5 most recent; the rest are one tap away (FR-017).
          limit={PREVIEW_ROWS}
          // Loading and error show only the card; an empty month gets its own line (FR-022).
          empty={
            status === 'ready' ? (
              <Appear on={['entrance', 'month']} slot={1}>
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

