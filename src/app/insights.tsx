import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayDetail, type Pace } from '@/domain/pace';
import { compareMonths, type YearMonth } from '@/domain/month';
import type { Trend } from '@/domain/trend';
import { dayDetailLines, trendDetailLines } from '@/format/insights';
import { useInsights } from '@/hooks/useInsights';
import { useRegion } from '@/hooks/useRegion';
import { logTiming } from '@/lib/devLog';
import { haptics } from '@/lib/haptics';
import { takePace } from '@/state/handedPace';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { CategoryChanges } from '@/ui/CategoryChanges';
import { MonthControl } from '@/ui/MonthControl';
import { CardTitle } from '@/ui/CardTitle';
import { PaceSentence, TrendHeadline } from '@/ui/PaceSentence';
import { ChartDetail } from '@/ui/ChartDetail';
import { PaceChart } from '@/ui/charts/PaceChart';
import { TrendChart } from '@/ui/charts/TrendChart';
import { chartSelection, initialChartSelection, type ChartSelectionEvent } from '@/ui/charts/selection';
import { ShapePressable } from '@/ui/glass';
import { durations, PressableScale, useReduceMotion } from '@/ui/motion';
import { iconSize, minTouch, radii, spacing, useTheme } from '@/ui/theme';

/** A loading section's area under its title (design.md, Insights screen, Loading). */
const LOADING_HEIGHT = 112;

/**
 * Insights for the selected month (contracts/ui-screens.md, Insights screen). Read-only: nothing
 * here adds, edits or deletes a transaction (FR-015). Android's back pops this stack screen on its
 * own, like `/transactions`.
 */
export default function InsightsScreen() {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selected } = useSelectedMonth();
  const { status, pace, categories, trend, retry } = useInsights();
  const { tag } = useRegion();
  // Shared with the pace chart's pan, so a vertical swipe that starts on the chart still scrolls.
  const scrollRef = useRef(null);
  useInsightsReadyTiming(selected, status === 'ready' && pace !== null && categories !== null && trend !== null);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: spacing.xs + insets.top, paddingBottom: spacing.xxl + insets.bottom }}
      >
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
            <Text accessibilityRole="header" style={[type.label, { color: colors.textMuted }]}>
              Insights
            </Text>
            <MonthControl />
          </View>
        </View>

        {status === 'error' ? (
          <ErrorCard onRetry={retry} />
        ) : (
          <>
            <PaceSection pace={pace} scrollRef={scrollRef} />
            <Section title="Categories vs last month">
              <CategoryChanges key={`${selected.year}-${selected.month}`} comparison={categories} selected={selected} tag={tag} />
            </Section>
            <Section title="Savings trend">
              {trend === null ? <Loading /> : <TrendSection trend={trend} />}
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * SC-002's `insights-ready` line (research R10): ms from the card press to the first commit with
 * all three sections drawn, once per open. Skipped when the screen was not opened from the card,
 * or the month changed first (the time would include the person's own taps).
 */
function useInsightsReadyTiming(selected: YearMonth, ready: boolean) {
  const [opened] = useState(() => ({ month: selected, pressedAt: takePace(selected)?.pressedAt ?? null }));
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !ready) return;
    done.current = true;
    if (opened.pressedAt !== null && compareMonths(selected, opened.month) === 0) {
      logTiming('insights-ready', performance.now() - opened.pressedAt);
    }
  }, [ready, selected, opened]);
}

function PaceSection({ pace, scrollRef }: { pace: Pace | null; scrollRef: RefObject<null> }) {
  const { tag } = useRegion();
  const { selected } = useSelectedMonth();
  const [selection, dispatch] = useReducer(chartSelection, initialChartSelection);

  // A month change hides any open detail (FR-031).
  const shownMonth = useRef(selected);
  useEffect(() => {
    if (shownMonth.current === selected) return;
    shownMonth.current = selected;
    dispatch({ type: 'reset' });
  }, [selected]);

  // The lines draw in only with the screen's first data, never after a month change (design.md).
  const [firstMonth] = useState(selected);
  const reveal = selected === firstMonth;

  const onChartEvent = (event: ChartSelectionEvent) => {
    // One haptic when a day becomes selected, or the day under the finger changes (design.md).
    const next = chartSelection(selection, event);
    if (next.selected !== null && next.selected !== selection.selected) haptics.select();
    dispatch(event);
  };

  const day = pace && selection.selected !== null ? selection.selected : null;

  return (
    <Section title="Spending pace">
      {pace === null ? (
        <Loading />
      ) : (
        <>
          <PaceSentence sentence={pace.sentence} tag={tag} />
          <PaceChart
            variant="full"
            pace={pace}
            tag={tag}
            selectedDay={day}
            onEvent={onChartEvent}
            scrollRef={scrollRef}
            reveal={reveal}
          />
          {day !== null && <ChartDetail lines={dayDetailLines(dayDetail(pace, day), pace, tag)} />}
        </>
      )}
    </Section>
  );
}

function TrendSection({ trend }: { trend: Trend }) {
  const { colors, type } = useTheme();
  const { tag } = useRegion();
  const { selected, setSelected } = useSelectedMonth();
  const [selection, dispatch] = useReducer(chartSelection, initialChartSelection);

  // A month change, from View month or elsewhere, hides the open detail (FR-030, FR-031).
  const shownMonth = useRef(selected);
  useEffect(() => {
    if (shownMonth.current === selected) return;
    shownMonth.current = selected;
    dispatch({ type: 'reset' });
  }, [selected]);

  const [firstMonth] = useState(selected);

  if (trend.monthsWithData === 0) {
    return (
      <Text style={[type.body, { color: colors.textMuted }]}>No data yet</Text>
    );
  }

  const index = selection.selected;
  const open = index !== null ? trend.months[index] : null;
  const isScreenMonth = open !== null && open.month.year === selected.year && open.month.month === selected.month;

  const onActivate = (i: number) => {
    // One haptic when a month is selected or hidden (design.md, Haptics).
    haptics.select();
    dispatch({ type: 'activate', day: i });
  };

  const viewMonth = () => {
    if (!open) return;
    haptics.monthChange();
    setSelected(open.month);
  };

  return (
    <>
      <TrendHeadline trend={trend} tag={tag} />
      <TrendChart
        trend={trend}
        tag={tag}
        screenMonth={selected}
        selectedIndex={index}
        onActivate={onActivate}
        reveal={selected === firstMonth}
      />
      {open !== null && (
        <ChartDetail
          lines={trendDetailLines(open, tag)}
          action={
            isScreenMonth ? undefined : (
              <ShapePressable
                accessibilityRole="button"
                accessibilityLabel="View month"
                onPress={viewMonth}
                style={[styles.viewMonth, { backgroundColor: colors.surface }]}
              >
                <Text style={[type.bodyStrong, { color: colors.accent }]}>View month</Text>
                <Feather name="chevron-right" size={iconSize.circle} color={colors.accent} />
              </ShapePressable>
            )
          }
        />
      )}
    </>
  );
}

/**
 * One section as one card with its small, quiet title inside, as on the summary (fine-tuning
 * 2026-10-09, like Revolut): the content, not a large heading, says what the card is about.
 */
function Section({ title, children }: { title: string; children?: ReactNode }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    // The sections below a detail box move with it (design.md, Motion, "Detail in").
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(durations.fast)}
      style={[styles.card, styles.section, cardLook(colors)]}
    >
      <CardTitle title={title} inside />
      {children}
    </Animated.View>
  );
}

function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
    </View>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  const { colors, type } = useTheme();
  return (
    <View style={[styles.card, styles.error, cardLook(colors)]}>
      <Text style={[type.body, { color: colors.text, textAlign: 'center' }]}>Couldn&apos;t load your data.</Text>
      <ShapePressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: colors.fieldFill, borderColor: colors.fieldBorder }]}
      >
        <Text style={[type.bodyStrong, { color: colors.text }]}>Try again</Text>
      </ShapePressable>
    </View>
  );
}

const cardLook = (colors: ReturnType<typeof useTheme>['colors']) => [
  { backgroundColor: colors.surface },
  colors.tileShadow !== '' && { boxShadow: colors.tileShadow },
];

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  card: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radii.card },
  // Cards 16 apart, as on the summary; the title, sentence and chart 8 apart inside.
  section: { marginTop: spacing.md, gap: spacing.xs },
  loading: { height: LOADING_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  error: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  viewMonth: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: minTouch,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginTop: spacing.xxs,
    borderRadius: radii.full,
  },
  retry: {
    minHeight: minTouch,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
