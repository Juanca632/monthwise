import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayDetail, type Pace } from '@/domain/pace';
import { monthTitle } from '@/format/date';
import { dayDetailLines, paceSentence } from '@/format/insights';
import { useInsights } from '@/hooks/useInsights';
import { useRegion } from '@/hooks/useRegion';
import { haptics } from '@/lib/haptics';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { ChartDetail } from '@/ui/ChartDetail';
import { PaceChart } from '@/ui/charts/PaceChart';
import { chartSelection, initialChartSelection, type ChartSelectionEvent } from '@/ui/charts/selection';
import { ShapePressable } from '@/ui/glass';
import { durations, PressableScale, useReduceMotion } from '@/ui/motion';
import { iconSize, minTouch, radii, spacing, useTheme } from '@/ui/theme';

/** A loading section's card (design.md, Insights screen, Loading). */
const LOADING_CARD_HEIGHT = 140;

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
  const { status, pace, retry } = useInsights();
  // Shared with the pace chart's pan, so a vertical swipe that starts on the chart still scrolls.
  const scrollRef = useRef(null);

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
            {/* Becomes the month control with US4 (T049). */}
            <Text style={[type.heading, { color: colors.text }]}>{monthTitle(selected)}</Text>
          </View>
        </View>

        {status === 'error' ? (
          <ErrorCard onRetry={retry} />
        ) : (
          <>
            <PaceSection pace={pace} scrollRef={scrollRef} />
            {/* Their content comes with US2 (T034) and US3 (T041). */}
            <Section title="Categories vs last month">{status === 'loading' && <LoadingCard />}</Section>
            <Section title="Savings trend">{status === 'loading' && <LoadingCard />}</Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PaceSection({ pace, scrollRef }: { pace: Pace | null; scrollRef: RefObject<null> }) {
  const { colors, type } = useTheme();
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
        <LoadingCard />
      ) : (
        <View style={[styles.card, styles.paceCard, cardLook(colors)]}>
          <Text style={[type.title, { color: colors.text }]}>{paceSentence(pace.sentence, tag)}</Text>
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
        </View>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children?: ReactNode }) {
  const { colors, type } = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    // The sections below a detail box move with it (design.md, Motion, "Detail in").
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.duration(durations.fast)}>
      <Text accessibilityRole="header" style={[type.heading, styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

function LoadingCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, styles.loading, cardLook(colors)]}>
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
  sectionTitle: { paddingTop: spacing.md, paddingBottom: spacing.xs, paddingHorizontal: spacing.xl },
  card: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radii.card },
  paceCard: { gap: spacing.xs },
  loading: { height: LOADING_CARD_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  error: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
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
