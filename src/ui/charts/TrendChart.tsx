import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { YearMonth } from '@/domain/month';
import type { Trend } from '@/domain/trend';
import { monthName } from '@/format/date';
import { shortMonthName, trendSpokenValue } from '@/format/insights';
import { durations, easeOut, useReduceMotion } from '@/ui/motion';
import { chart, minTouch, spacing, useTheme } from '@/ui/theme';

import { barScale, HAIRLINE } from './geometry';

/** The plot plus the inset that keeps a bar's rounded end off the card's edge. */
const PLOT_BOX = chart.trendPlot + chart.trendBottomInset;
const COLUMN_RADIUS = 12;

type Props = {
  trend: Trend;
  tag: string;
  /** The screen's month, whose name is bold. */
  screenMonth: YearMonth;
  /** Index of the month whose detail is open, or `null`. */
  selectedIndex: number | null;
  onActivate: (index: number) => void;
  /** Bars grow from the zero line: only with the screen's first data (design.md, Motion). */
  reveal?: boolean;
};

const sameMonth = (a: YearMonth, b: YearMonth) => a.year === b.year && a.month === b.month;

/**
 * The savings trend (design.md, Trend; developer, 2026-10-09): one bar per month for what it
 * saved, up from a shared zero line, or down in `error` when negative. Each column is a button;
 * its value gives income, expenses, saved and the rate, which the chart does not draw.
 */
export function TrendChart({ trend, tag, screenMonth, selectedIndex, onActivate, reveal = false }: Props) {
  const { colors, type } = useTheme();
  const [width, setWidth] = useState(0);

  const { zeroY, unit } = barScale(
    trend.months.filter((m) => m.hasData).map((m) => m.savedCents),
    chart.trendPlot,
  );
  const column = width / trend.months.length;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.columns}>
        {trend.months.map((m, i) => {
          const selected = selectedIndex === i;
          const isScreenMonth = sameMonth(m.month, screenMonth);
          return (
            <Pressable
              key={`${m.month.year}-${m.month.month}`}
              accessibilityRole="button"
              accessibilityLabel={monthName(m.month)}
              accessibilityValue={{ text: trendSpokenValue(m, tag) }}
              accessibilityState={{ selected }}
              onPress={() => onActivate(i)}
              style={[styles.column, selected && { backgroundColor: colors.chartBand }]}
            >
              {/* A month with no data stays empty (fine-tuning 2026-10-09): no bar, no text. Its
                  value says "No data"; a month that saved 0 draws a line, so they never look alike. */}
              <View style={styles.plot} />
              <Text
                style={[
                  selected || isScreenMonth ? type.legendStrong : type.legend,
                  { color: selected ? colors.accent : isScreenMonth ? colors.text : colors.textMuted },
                ]}
              >
                {shortMonthName(m.month)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {width > 0 && (
        <Bars
          zeroY={zeroY}
          reveal={reveal}
          bars={trend.months.map((m, i) => ({
            x: column * (i + 0.5),
            hasData: m.hasData,
            saved: m.savedCents,
            height: Math.abs(m.savedCents) * unit,
          }))}
          width={width}
        />
      )}
    </View>
  );
}

type Bar = { x: number; hasData: boolean; saved: number; height: number };

/** The marks' layer over the columns: the zero line and one bar per month with data. */
function Bars({ bars, zeroY, width, reveal }: { bars: Bar[]; zeroY: number; width: number; reveal: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  // Decided at mount: the screen turns `reveal` off after its first data.
  const [animate] = useState(reveal && !reduceMotion);
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) progress.set(withTiming(1, { duration: durations.standard, easing: easeOut }));
  }, [animate, progress]);
  // One scaleY on the whole layer, from the zero line (design.md, Motion, "The trend appears").
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleY: progress.value }] }));

  const top = spacing.xs;
  return (
    <Animated.View
      testID="trend-bars"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={[styles.bars, { top, width, transformOrigin: `50% ${zeroY}px` }, grow]}
    >
      <View style={[styles.zero, { top: zeroY - HAIRLINE / 2, backgroundColor: colors.chartZero }]} />
      {bars.map((bar, i) => {
        if (!bar.hasData) return null;
        const left = bar.x - chart.trendBar / 2;
        if (bar.saved === 0) {
          return (
            <View
              key={i}
              testID="trend-bar"
              style={[styles.bar, { left, top: zeroY - chart.zeroBar / 2, height: chart.zeroBar, backgroundColor: colors.chartCurrent }]}
            />
          );
        }
        const up = bar.saved > 0;
        return (
          <View
            key={i}
            testID="trend-bar"
            style={[
              styles.bar,
              up
                ? { left, top: zeroY - bar.height, height: bar.height, backgroundColor: colors.chartCurrent, ...upCorners }
                : { left, top: zeroY, height: bar.height, backgroundColor: colors.error, ...downCorners },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

// Rounded only at the bar's far end; its base sits flat on the zero line.
const upCorners = { borderTopLeftRadius: chart.barRadius, borderTopRightRadius: chart.barRadius };
const downCorners = { borderBottomLeftRadius: chart.barRadius, borderBottomRightRadius: chart.barRadius };

const styles = StyleSheet.create({
  columns: { flexDirection: 'row' },
  column: {
    flex: 1,
    minWidth: minTouch,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderRadius: COLUMN_RADIUS,
  },
  plot: { height: PLOT_BOX, alignSelf: 'stretch', justifyContent: 'center' },
  bars: { position: 'absolute', left: 0, height: PLOT_BOX },
  zero: { position: 'absolute', left: 0, right: 0, height: HAIRLINE },
  bar: { position: 'absolute', width: chart.trendBar },
});
