import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, type GestureTouchEvent } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { dayDetail, type DailySeries, type Pace } from '@/domain/pace';
import { monthName } from '@/format/date';
import { daySpokenValue } from '@/format/insights';
import { useScreenReader } from '@/hooks/useScreenReader';
import { durations, easeOut, useReduceMotion } from '@/ui/motion';
import { chart, spacing, useTheme, type Palette } from '@/ui/theme';

import {
  AREA_BOTTOM_OPACITY,
  GRID_FRACTIONS,
  HAIRLINE,
  dayAtX,
  lineScale,
  linePath,
  seriesPoints,
  xOfDay,
  type Point,
} from './geometry';
import type { ChartSelectionEvent } from './selection';

/** contracts/ui-screens.md, Touch: a first move this far vertically, still on its day, scrolls. */
const SCROLL_SLOP = 8;
const DAY_MARKS = [1, 8, 15, 22, 29] as const;
/** No day under the finger or selected. */
const NO_DAY = 0;

type CompactProps = { variant: 'compact'; pace: Pace; reveal?: boolean };
type FullProps = {
  variant: 'full';
  pace: Pace;
  tag: string;
  /** The `chartSelection` reducer's selected day, owned by the screen. */
  selectedDay: number | null;
  onEvent: (event: ChartSelectionEvent) => void;
  /** Insights' gesture-handler ScrollView: it waits for the chart's pan to fail (vertical move). */
  scrollRef?: RefObject<unknown>;
  reveal?: boolean;
};
export type PaceChartProps = CompactProps | FullProps;

type Plot = { top: number; height: number; total: number };
const COMPACT: Plot = { top: chart.cardInset, height: chart.cardHeight - 2 * chart.cardInset, total: chart.cardHeight };
const FULL: Plot = { top: chart.paceTop, height: chart.pacePlot, total: chart.paceHeight };

type Drawing = {
  selected: Point[];
  previous: Point[] | null;
  /** y of each day's marker, 1-based index; -1 when that line has no value that day. */
  selectedYs: number[];
  previousYs: number[];
};

/** Geometry once per data and width (design.md, Performance rules). */
function draw(pace: Pace, width: number, plot: Plot): Drawing {
  const days = pace.chartDays;
  const lines = [pace.selected, pace.previous].filter((s): s is DailySeries => s !== null);
  const max = Math.max(0, ...lines.flatMap((s) => s.cumulativeCents));
  const scale = lineScale(max, plot.height);
  const points = (s: DailySeries) => seriesPoints(s.cumulativeCents, width, plot.height, scale, days, plot.top);
  const selected = points(pace.selected);
  const previous = pace.previous ? points(pace.previous) : null;
  const ys = (pts: Point[] | null, clampToEnd: boolean) =>
    Array.from({ length: days + 1 }, (_, day) => {
      if (!pts || day === 0) return -1;
      // Past its last day the previous month's marker sits on its end point (design.md).
      if (day > pts.length) return clampToEnd ? pts[pts.length - 1].y : -1;
      return pts[day - 1].y;
    });
  return { selected, previous, selectedYs: ys(selected, false), previousYs: ys(previous, true) };
}

/** The selected line's fill: down to the baseline under its first and last points. */
function areaPath(points: Point[], baseline: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
}

/**
 * The spending pace chart (design.md, Chart geometry; research R5, R6): the selected month's
 * cumulative spending against the previous month's, over 31 days. `compact` is the summary card's
 * drawing; `full` is Insights', with day marks, touch and the selected day.
 */
export function PaceChart(props: PaceChartProps) {
  const { pace, variant } = props;
  const { colors } = useTheme();
  const plot = variant === 'full' ? FULL : COMPACT;
  const [width, setWidth] = useState(0);
  const sharedWidth = useSharedValue(0);
  const drawing = useMemo(() => draw(pace, width, plot), [pace, width, plot]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    sharedWidth.set(w);
    setWidth(w);
  };

  const legend = <Legend pace={pace} colors={colors} />;
  const svg = (
    <ChartSvg drawing={drawing} width={width} plot={plot} colors={colors} full={variant === 'full'} />
  );

  if (variant === 'compact') {
    const end = drawing.selected[drawing.selected.length - 1];
    return (
      <View style={styles.compact}>
        <View
          testID="pace-chart-compact"
          onLayout={onLayout}
          style={{ height: plot.total }}
          importantForAccessibility="no-hide-descendants"
        >
          {svg}
          {end && <Dot point={end} kind="end" colors={colors} />}
          <RevealCover reveal={props.reveal ?? false} width={width} color={colors.surface} />
        </View>
        {legend}
      </View>
    );
  }

  return (
    <View style={styles.full}>
      {legend}
      <FullPlot {...props} drawing={drawing} width={width} sharedWidth={sharedWidth} onLayout={onLayout}>
        {svg}
      </FullPlot>
      <DayMarks width={width} days={pace.chartDays} colors={colors} />
    </View>
  );
}

function ChartSvg({
  drawing,
  width,
  plot,
  colors,
  full,
}: {
  drawing: Drawing;
  width: number;
  plot: Plot;
  colors: Palette;
  full: boolean;
}) {
  if (width <= 0) return null;
  const baseline = plot.top + plot.height;
  const hairline = baseline - HAIRLINE / 2;
  return (
    <Svg width={width} height={plot.total} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="paceArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.chartArea} />
          <Stop offset="1" stopColor={colors.chartCurrent} stopOpacity={AREA_BOTTOM_OPACITY} />
        </LinearGradient>
      </Defs>
      {full &&
        GRID_FRACTIONS.map((f) => {
          const y = plot.top + plot.height * f;
          return <Line key={f} x1={0} x2={width} y1={y} y2={y} stroke={colors.chartGrid} strokeWidth={HAIRLINE} />;
        })}
      {drawing.previous && (
        <Path
          d={linePath(drawing.previous)}
          fill="none"
          stroke={colors.chartPrevious}
          strokeWidth={chart.previousWidth}
          strokeDasharray={[...chart.previousDash]}
          strokeLinejoin="round"
        />
      )}
      <Path d={areaPath(drawing.selected, baseline)} fill="url(#paceArea)" />
      <Path
        d={linePath(drawing.selected)}
        fill="none"
        stroke={colors.chartCurrent}
        strokeWidth={chart.currentWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={0}
        x2={width}
        y1={hairline}
        y2={hairline}
        stroke={full ? colors.chartAxis : colors.chartGrid}
        strokeWidth={HAIRLINE}
      />
    </Svg>
  );
}

type DotKind = 'end' | 'current' | 'previous';

/** A ringed circle as a view, so the full chart can move it on the UI thread (design.md, Layers). */
function dotLook(kind: DotKind, colors: Palette) {
  const [radius, ring, fill, stroke] =
    kind === 'end'
      ? [chart.endDot, chart.ringEnd, colors.chartCurrent, colors.surface]
      : kind === 'current'
        ? [chart.markerCurrent, chart.ringCurrent, colors.chartCurrent, colors.surface]
        : [chart.markerPrevious, chart.previousRing, colors.surface, colors.chartPrevious];
  // An SVG stroke is centered on the circle's edge; a view's border sits inside it.
  const size = 2 * radius + ring;
  return {
    size,
    style: {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: ring,
      borderColor: stroke,
      backgroundColor: fill,
    },
  };
}

function Dot({ point, kind, colors }: { point: Point; kind: DotKind; colors: Palette }) {
  const { size, style } = dotLook(kind, colors);
  return (
    <View
      pointerEvents="none"
      style={[style, { transform: [{ translateX: point.x - size / 2 }, { translateY: point.y - size / 2 }] }]}
    />
  );
}

/** A `surface` cover that slides off to the right: the lines appear left to right (design.md, Motion). */
function RevealCover({ reveal, width, color }: { reveal: boolean; width: number; color: string }) {
  const reduceMotion = useReduceMotion();
  // Decided once, at mount: the screen turns `reveal` off after its first data.
  const [animate] = useState(reveal && !reduceMotion);
  const progress = useSharedValue(animate ? 0 : 1);
  const started = useRef(false);

  useEffect(() => {
    if (!animate || width <= 0 || started.current) return;
    started.current = true;
    progress.set(withTiming(1, { duration: durations.standard, easing: easeOut }));
  }, [animate, width, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value >= 1 ? 0 : 1,
    transform: [{ translateX: progress.value * width }],
  }));

  if (!animate) return null;
  return (
    <Animated.View
      testID="pace-reveal"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
}

function Legend({ pace, colors }: { pace: Pace; colors: Palette }) {
  const { type } = useTheme();
  const items = [
    { month: pace.selected.month, previous: false },
    ...(pace.previous ? [{ month: pace.previous.month, previous: true }] : []),
  ];
  return (
    <View style={styles.legend}>
      {items.map(({ month, previous }) => (
        <View key={previous ? 'previous' : 'selected'} style={styles.legendItem}>
          <Svg width={chart.lineSwatch.width} height={chart.lineSwatch.height} importantForAccessibility="no-hide-descendants">
            {previous ? (
              <Line
                x1={0}
                x2={chart.lineSwatch.width}
                y1={chart.lineSwatch.height / 2}
                y2={chart.lineSwatch.height / 2}
                stroke={colors.chartPrevious}
                strokeWidth={chart.previousWidth}
                strokeDasharray={[...chart.previousDash]}
              />
            ) : (
              <Line
                x1={chart.currentWidth / 2}
                x2={chart.lineSwatch.width - chart.currentWidth / 2}
                y1={chart.lineSwatch.height / 2}
                y2={chart.lineSwatch.height / 2}
                stroke={colors.chartCurrent}
                strokeWidth={chart.currentWidth}
                strokeLinecap="round"
              />
            )}
          </Svg>
          <Text style={[type.legend, { color: colors.textMuted }]}>{monthName(month)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Day numbers and ticks under the full chart; Text views, so they scale with the font. */
function DayMarks({ width, days, colors }: { width: number; days: number; colors: Palette }) {
  const { type } = useTheme();
  const LABEL_SLOT = 48;
  return (
    <View style={styles.marks} importantForAccessibility="no-hide-descendants">
      {/* Sets the row's height to one label line at the current font scale. */}
      <Text style={[type.legend, styles.spacer]}> </Text>
      {width > 0 &&
        DAY_MARKS.map((day) => {
          const x = xOfDay(day, width, days);
          return (
            <View key={day} style={[styles.mark, { left: x - LABEL_SLOT / 2, width: LABEL_SLOT }]}>
              <View style={[styles.tick, { backgroundColor: colors.chartAxis }]} />
              <Text style={[type.legend, { color: colors.textMuted }]}>{day}</Text>
            </View>
          );
        })}
    </View>
  );
}

type FullPlotProps = FullProps & {
  drawing: Drawing;
  width: number;
  sharedWidth: SharedValue<number>;
  onLayout: (e: LayoutChangeEvent) => void;
  children: ReactNode;
};

/** The full chart's touch area and everything that follows the finger (design.md, Layers). */
function FullPlot({
  pace,
  tag,
  selectedDay,
  onEvent,
  scrollRef,
  reveal,
  drawing,
  width,
  sharedWidth,
  onLayout,
  children,
}: FullPlotProps) {
  const { colors } = useTheme();
  const screenReader = useScreenReader();
  const days = pace.chartDays;

  // The day drawn as selected. JS sets it from the reducer; during a drag the gesture moves it on
  // the UI thread first, and JS catches up with one event per day change.
  const shownDay = useSharedValue(selectedDay ?? NO_DAY);
  useEffect(() => {
    shownDay.set(selectedDay ?? NO_DAY);
  }, [selectedDay, shownDay]);

  const selectedYs = useSharedValue(drawing.selectedYs);
  const previousYs = useSharedValue(drawing.previousYs);
  useEffect(() => {
    selectedYs.set(drawing.selectedYs);
    previousYs.set(drawing.previousYs);
  }, [drawing, selectedYs, previousYs]);

  // A stable callback for the gesture, which is built once.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });
  const emit = useCallback((event: ChartSelectionEvent) => onEventRef.current(event), []);

  const gesture = usePaceGesture(sharedWidth, shownDay, days, emit, scrollRef);

  const bandStyle = useAnimatedStyle(() => {
    const day = shownDay.value;
    const w = sharedWidth.value / days;
    return { opacity: day === NO_DAY ? 0 : 1, width: w, transform: [{ translateX: (day - 1) * w }] };
  });
  const guideStyle = useAnimatedStyle(() => {
    const day = shownDay.value;
    const x = ((day - 0.5) * sharedWidth.value) / days;
    return { opacity: day === NO_DAY ? 0 : 1, transform: [{ translateX: x - HAIRLINE / 2 }] };
  });
  const endStyle = useAnimatedStyle(() => ({ opacity: shownDay.value === NO_DAY ? 1 : 0 }));

  const end = drawing.selected[drawing.selected.length - 1];

  return (
    <GestureDetector gesture={gesture}>
      <View testID="pace-chart" onLayout={onLayout} style={{ height: FULL.total }}>
        <Animated.View
          pointerEvents="none"
          style={[styles.band, { backgroundColor: colors.chartBand, top: FULL.top, height: FULL.height }, bandStyle]}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          {children}
          {end && (
            <Animated.View style={[StyleSheet.absoluteFill, endStyle]}>
              <Dot point={end} kind="end" colors={colors} />
            </Animated.View>
          )}
          <Animated.View
            style={[styles.guide, { backgroundColor: colors.chartGuide, top: FULL.top, height: FULL.height }, guideStyle]}
          />
          <Marker kind="previous" ys={previousYs} shownDay={shownDay} width={sharedWidth} days={days} colors={colors} />
          <Marker kind="current" ys={selectedYs} shownDay={shownDay} width={sharedWidth} days={days} colors={colors} />
          <RevealCover reveal={reveal ?? false} width={width} color={colors.surface} />
        </View>
        {screenReader && width > 0 && (
          <DayButtons pace={pace} tag={tag} selectedDay={selectedDay} width={width} onEvent={emit} />
        )}
      </View>
    </GestureDetector>
  );
}

function Marker({
  kind,
  ys,
  shownDay,
  width,
  days,
  colors,
}: {
  kind: 'current' | 'previous';
  ys: SharedValue<number[]>;
  shownDay: SharedValue<number>;
  width: SharedValue<number>;
  days: number;
  colors: Palette;
}) {
  const { size, style } = dotLook(kind, colors);
  const animated = useAnimatedStyle(() => {
    const day = shownDay.value;
    const y = day === NO_DAY ? -1 : (ys.value[day] ?? -1);
    const x = ((day - 0.5) * width.value) / days;
    return {
      opacity: y < 0 ? 0 : 1,
      transform: [{ translateX: x - size / 2 }, { translateY: Math.max(y, 0) - size / 2 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[style, animated]} />;
}

/** TalkBack only (research R6): one transparent button per day band; activating it acts as a tap. */
function DayButtons({
  pace,
  tag,
  selectedDay,
  width,
  onEvent,
}: {
  pace: Pace;
  tag: string;
  selectedDay: number | null;
  width: number;
  onEvent: (event: ChartSelectionEvent) => void;
}) {
  const band = width / pace.chartDays;
  return (
    <View style={[StyleSheet.absoluteFill, { top: FULL.top, height: FULL.height }]}>
      {Array.from({ length: pace.chartDays }, (_, i) => {
        const day = i + 1;
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={`Day ${day}`}
            accessibilityValue={{ text: daySpokenValue(dayDetail(pace, day), pace, tag) }}
            accessibilityState={{ selected: selectedDay === day }}
            onPress={() => onEvent({ type: 'activate', day })}
            style={[styles.dayButton, { left: i * band, width: band }]}
          />
        );
      })}
    </View>
  );
}

/**
 * contracts/ui-screens.md, Touch: one manually activated pan. It stays undecided while the finger
 * is on its touch-down day, activates (a drag) once the finger reaches another day, and fails on
 * a first vertical move, which lets the screen scroll. Every callback is a worklet reading only
 * shared values; JS gets `down`, `move` (only on a day change), `up` and `cancel`.
 */
function usePaceGesture(
  width: SharedValue<number>,
  shownDay: SharedValue<number>,
  days: number,
  emit: (event: ChartSelectionEvent) => void,
  scrollRef: RefObject<unknown> | undefined,
) {
  const downDay = useSharedValue(NO_DAY);
  const lastDay = useSharedValue(NO_DAY);
  const start = useSharedValue({ x: 0, y: 0 });
  const dragging = useSharedValue(false);
  /** Failed or finished: later touches of the same gesture change nothing. */
  const done = useSharedValue(true);

  return useMemo(() => {
    const touchOf = (e: GestureTouchEvent) => {
      'worklet';
      return e.changedTouches[0] ?? e.allTouches[0];
    };
    let pan = Gesture.Pan()
      .manualActivation(true)
      .withTestId('pace-chart')
      .onTouchesDown((e) => {
        const t = touchOf(e);
        if (!t) return;
        const day = dayAtX(t.x, width.value, days);
        start.set({ x: t.x, y: t.y });
        downDay.set(day);
        lastDay.set(day);
        dragging.set(false);
        done.set(false);
        runOnJS(emit)({ type: 'down', day });
      })
      .onTouchesMove((e, manager) => {
        const t = touchOf(e);
        if (!t || done.value) return;
        const day = dayAtX(t.x, width.value, days);
        if (!dragging.value) {
          if (day === downDay.value) {
            const dy = Math.abs(t.y - start.value.y);
            const dx = Math.abs(t.x - start.value.x);
            if (dy > SCROLL_SLOP && dy > dx) {
              done.set(true);
              manager.fail();
              runOnJS(emit)({ type: 'cancel' });
            }
            return;
          }
          dragging.set(true);
          manager.activate();
        }
        if (day === lastDay.value) return;
        lastDay.set(day);
        shownDay.set(day);
        runOnJS(emit)({ type: 'move', day });
      })
      .onTouchesUp((_e, manager) => {
        if (done.value) return;
        done.set(true);
        // A tap never activated: failing it leaves the scroll free (tasks.md, T023).
        if (dragging.value) manager.end();
        else manager.fail();
        runOnJS(emit)({ type: 'up' });
      })
      .onTouchesCancelled((_e, manager) => {
        if (done.value) return;
        done.set(true);
        manager.fail();
        runOnJS(emit)({ type: 'cancel' });
      });
    if (scrollRef) {
      pan = pan.blocksExternalGesture(scrollRef as Parameters<typeof pan.blocksExternalGesture>[0]);
    }
    return pan;
  }, [width, shownDay, days, emit, scrollRef, downDay, lastDay, start, dragging, done]);
}

const styles = StyleSheet.create({
  compact: { gap: spacing.xs, marginTop: spacing.xxs },
  full: { gap: spacing.xxs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xxs, columnGap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  band: { position: 'absolute', left: 0, borderRadius: chart.bandRadius },
  guide: { position: 'absolute', left: 0, width: HAIRLINE },
  marks: { position: 'relative' },
  spacer: { opacity: 0, marginTop: chart.tickLength },
  mark: { position: 'absolute', top: 0, alignItems: 'center' },
  tick: { width: HAIRLINE, height: chart.tickLength },
  dayButton: { position: 'absolute', top: 0, bottom: 0 },
});
