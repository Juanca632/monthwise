import { chart } from '@/ui/theme';

// Chart coordinates are floats for drawing only, computed from cents and never shown as amounts
// (tasks.md conventions). Every function is a worklet so gesture callbacks can call it on the UI
// thread; on the JS thread the directive is a plain string.

/** Drawing fractions that are not sizes (design.md, Chart geometry). */
export const GRID_FRACTIONS = [1 / 3, 2 / 3] as const;
export const HAIRLINE = 1;
/** The area fill under the selected line fades to this opacity at the baseline. */
export const AREA_BOTTOM_OPACITY = 0;

export type Point = { x: number; y: number };

/** Day N covers `[(N-1)·w/D, N·w/D)`; beyond either edge it clamps to day 1 or day D. */
export function dayAtX(x: number, width: number, days: number): number {
  'worklet';
  if (width <= 0) return 1;
  const day = Math.floor((x * days) / width) + 1;
  return Math.min(Math.max(day, 1), days);
}

/** The center of day N's band, where its point sits. */
export function xOfDay(day: number, width: number, days: number): number {
  'worklet';
  return ((day - 0.5) * width) / days;
}

/**
 * Pixels per cent for a plot of `height`: 0 at the baseline, the largest value × the headroom at
 * the top, so the highest point never touches the edge. 0 when there is nothing to draw, so every
 * point lies on the baseline.
 */
export function lineScale(maxCents: number, height: number): number {
  'worklet';
  return maxCents > 0 ? height / (maxCents * chart.yHeadroom) : 0;
}

/** The point of each day of a cumulative series; `top` is where the plot starts. */
export function seriesPoints(
  cumulativeCents: readonly number[],
  width: number,
  height: number,
  scale: number,
  days: number,
  top = 0,
): Point[] {
  'worklet';
  return cumulativeCents.map((cents, i) => ({
    x: xOfDay(i + 1, width, days),
    y: top + height - cents * scale,
  }));
}

/** Straight segments, no smoothing: a curve would draw spending that did not happen. */
export function linePath(points: readonly Point[]): string {
  'worklet';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

export type BarScale = {
  /** y of the zero line, from the top of the plot. */
  zeroY: number;
  /** Pixels per cent; 0 when every value is 0. */
  unit: number;
};

/**
 * The trend's shared scale: room above zero for the largest positive value × the top headroom,
 * below it for the most negative one × the bottom headroom (0 when none is negative), so one zero
 * line crosses every column.
 */
export function barScale(values: readonly number[], height: number): BarScale {
  'worklet';
  let top = 0;
  let bottom = 0;
  for (const v of values) {
    if (v > top) top = v;
    if (-v > bottom) bottom = -v;
  }
  const above = top * chart.trendTopHeadroom;
  const below = bottom * chart.trendBottomHeadroom;
  const span = above + below;
  if (span === 0) return { zeroY: height, unit: 0 };
  const unit = height / span;
  return { zeroY: above * unit, unit };
}
