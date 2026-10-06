import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { YearMonth } from '@/domain/month';
import { useMonthSummary } from '@/hooks/useMonthSummary';
import { useRegion } from '@/hooks/useRegion';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { useSheetProgress } from '@/state/SheetTransitionContext';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { Appear, SummaryMotionProvider, type SummaryMotion } from '@/ui/Appear';
import { Breakdown } from '@/ui/Breakdown';
import { AccentButton, AmbientBackground } from '@/ui/glass';
import { MonthHeader } from '@/ui/MonthHeader';
import { useRowChanges } from '@/ui/RowMotion';
import { behindSheet, useReduceMotion } from '@/ui/motion';
import { StateMessage } from '@/ui/StateMessage';
import { balanceTone, iconSize, spacing, useTheme } from '@/ui/theme';
import { Totals, type TotalsContent } from '@/ui/Totals';
import { TransactionList } from '@/ui/TransactionList';

const ADD_HEIGHT = 56;
const ADD_GAP = spacing.xxl;
const BOTTOM_FADE_HEIGHT = 96;
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

/**
 * While a form's sheet is open the summary scales back, moves down and rounds its corners, and a
 * scrim dims it, all following the sheet. Under reduce motion only the scrim fades.
 */
function useBehindSheet() {
  const progress = useSheetProgress();
  const reduceMotion = useReduceMotion();
  const summary = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const p = progress.value;
    return {
      borderRadius: behindSheet.radius * p,
      transform: [
        { translateY: behindSheet.offset * p },
        { scale: 1 - (1 - behindSheet.scale) * p },
      ],
    };
  });
  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  return { summary, scrim };
}

/** The monthly summary (contracts/ui-screens.md, Summary screen). */
export default function SummaryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tag } = useRegion();
  const { status, rows, summary, retry } = useMonthSummary();
  const router = useRouter();
  const notice = useSummaryNotice();
  const motion = useSummaryMotion();
  const behind = useBehindSheet();
  // The totals come from the stored rows; the list may still show a deleted row leaving.
  const changes = useRowChanges(rows, status === 'ready', notice.lastChange);

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
    <SummaryMotionProvider value={motion}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Animated.View
          testID="summary-content"
          style={[styles.screen, styles.clip, { backgroundColor: colors.background }, behind.summary]}
        >
          {/* Same rule as the balance card: loading and error use the positive tone. */}
          <AmbientBackground
            tone={content.kind === 'values' ? balanceTone(content.balanceCents) : 'positive'}
          />
          <TransactionList
            rows={changes.rows}
            changeFor={changes.changeFor}
            tag={tag}
            header={
              <View style={{ paddingTop: spacing.sm + insets.top }}>
                <Appear on={['entrance']} slot={0}>
                  <Totals
                    tag={tag}
                    content={content}
                    header={(tone) => <MonthHeader tone={tone} />}
                  />
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
            // Shown in every state, so the simulated storage error can be turned off again.
            footer={DevTools ? <DevTools onChanged={retry} /> : null}
            onPressItem={openTransaction}
            bottomPadding={ADD_HEIGHT + ADD_GAP + spacing.md + insets.bottom}
          />
          {/* Lets the list pass softly under Add; a gradient, not a blur (design.md). */}
          <View
            testID="bottom-fade"
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[styles.bottomFade, { experimental_backgroundImage: colors.bottomFade }]}
          />
          <AddButton bottom={ADD_GAP + insets.bottom} />
        </Animated.View>
        {/* Dims the summary behind a form's sheet; touches go to the sheet's screen above. */}
        <Animated.View
          testID="scrim"
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, behind.scrim]}
        />
      </View>
    </SummaryMotionProvider>
  );
}

/** Always visible, whatever the summary's state (FR-002). */
function AddButton({ bottom }: { bottom: number }) {
  const { colors, type } = useTheme();
  const router = useRouter();
  return (
    <Appear on={['entrance']} slot={2} style={[styles.addWrapper, { bottom }]}>
      <AccentButton
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => router.push('/transaction/new')}
        style={styles.addButton}
      >
        <Feather name="plus" size={iconSize.button} color={colors.onAccent} />
        <Text style={[type.button, { color: colors.onAccent }]}>Add</Text>
      </AccentButton>
    </Appear>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  clip: { overflow: 'hidden' },
  addWrapper: { position: 'absolute', alignSelf: 'center' },
  addButton: { minHeight: ADD_HEIGHT, paddingHorizontal: spacing.xxl },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_FADE_HEIGHT,
  },
});
