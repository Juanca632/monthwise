import type { LedgerRow } from './ledger';
import {
  daysInMonth,
  isCurrentMonth,
  monthOf,
  previous as previousMonthOf,
  type IsoDate,
  type YearMonth,
} from './month';
import { percentOf, type Percent } from './percent';

/** `cumulativeCents[i]` is the spending by day `i + 1`; the length is the line's last day. */
export type DailySeries = { month: YearMonth; cumulativeCents: number[] };

export type PaceSentence =
  | { kind: 'noSpending' }
  | { kind: 'noPreviousData'; previousMonth: YearMonth; isCurrent: boolean }
  | {
      kind: 'more' | 'less' | 'same';
      /** Absolute, ≥ 0. */
      differenceCents: number;
      comparisonDay: number | null;
      previousMonth: YearMonth;
    };

export type Pace = {
  selected: DailySeries;
  /** `null`: the previous month has no data, so only one line is drawn. */
  previous: DailySeries | null;
  chartDays: number;
  /** `null`: a past month, compared as whole months. */
  comparisonDay: number | null;
  sentence: PaceSentence;
};

export type DayDetail = {
  day: number;
  selectedCents: number | null;
  previousCents: number | null;
  change: { differenceCents: number; percent: Percent | 'new' } | null;
};

/** Any two consecutive months include a 31-day one, so the chart never needs another width. */
const CHART_DAYS = 31;

const dayOf = (iso: IsoDate): number => Number(iso.slice(8, 10));

const inMonth = (row: LedgerRow, ym: YearMonth): boolean => {
  const m = monthOf(row.date);
  return m.year === ym.year && m.month === ym.month;
};

/** Running total of the month's expenses for days 1..length; income never counts as spending. */
function cumulative(rows: readonly LedgerRow[], ym: YearMonth, length: number): number[] {
  const daily = new Array<number>(length).fill(0);
  for (const row of rows) {
    if (row.type !== 'expense' || !inMonth(row, ym)) continue;
    const day = dayOf(row.date);
    if (day <= length) daily[day - 1] += row.amountCents;
  }
  let total = 0;
  return daily.map((cents) => (total += cents));
}

/**
 * Past month: its last day. Current month: the later of today's day and its latest row dated
 * after today, of any type, so a later-dated income runs the line on flat to its date.
 */
function lineEnd(selected: YearMonth, rows: readonly LedgerRow[], today: IsoDate): number {
  if (!isCurrentMonth(selected, today)) return daysInMonth(selected);
  let end = dayOf(today);
  for (const row of rows) {
    if (inMonth(row, selected)) end = Math.max(end, dayOf(row.date));
  }
  return end;
}

/** Spending by `day`, or by the line's last day when the line is shorter (a shorter month). */
const spentBy = (series: DailySeries, day: number): number =>
  series.cumulativeCents[Math.min(day, series.cumulativeCents.length) - 1] ?? 0;

export function computePace(
  selected: YearMonth,
  selectedRows: readonly LedgerRow[],
  previousRows: readonly LedgerRow[],
  today: IsoDate,
): Pace {
  const previousMonth = previousMonthOf(selected);
  const isCurrent = isCurrentMonth(selected, today);
  const comparisonDay = isCurrent ? dayOf(today) : null;

  const selectedSeries: DailySeries = {
    month: selected,
    cumulativeCents: cumulative(selectedRows, selected, lineEnd(selected, selectedRows, today)),
  };
  // "No data" means no rows of any type; a month with only income still draws a flat line.
  const hasPrevious = previousRows.some((row) => inMonth(row, previousMonth));
  const previousSeries: DailySeries | null = hasPrevious
    ? {
        month: previousMonth,
        cumulativeCents: cumulative(previousRows, previousMonth, daysInMonth(previousMonth)),
      }
    : null;

  // Rows after today stay out of the comparison until their date is reached (spec Edge Cases).
  const selectedSpent =
    comparisonDay === null
      ? spentBy(selectedSeries, daysInMonth(selected))
      : spentBy(selectedSeries, comparisonDay);
  const previousSpent =
    previousSeries === null
      ? 0
      : spentBy(previousSeries, comparisonDay ?? daysInMonth(previousMonth));

  // FR-003: the first rule that applies.
  let sentence: PaceSentence;
  if (selectedSpent === 0 && previousSpent === 0) {
    sentence = { kind: 'noSpending' };
  } else if (previousSeries === null) {
    sentence = { kind: 'noPreviousData', previousMonth, isCurrent };
  } else {
    const difference = selectedSpent - previousSpent;
    sentence = {
      kind: difference > 0 ? 'more' : difference < 0 ? 'less' : 'same',
      differenceCents: Math.abs(difference),
      comparisonDay,
      previousMonth,
    };
  }

  return {
    selected: selectedSeries,
    previous: previousSeries,
    chartDays: CHART_DAYS,
    comparisonDay,
    sentence,
  };
}

/** FR-007: both amounts for `day` (1..`pace.chartDays`) and their change. */
export function dayDetail(pace: Pace, day: number): DayDetail {
  const line = pace.selected.cumulativeCents;
  // Null after the line end; the line never runs past the month's last day.
  const selectedCents = day <= line.length ? line[day - 1] : null;
  // Past the previous month's last day its whole month counts.
  const previousCents = pace.previous === null ? null : spentBy(pace.previous, day);

  let change: DayDetail['change'] = null;
  if (selectedCents !== null && previousCents !== null) {
    const differenceCents = selectedCents - previousCents;
    const percent =
      previousCents > 0
        ? percentOf(differenceCents, previousCents)
        : selectedCents > 0
          ? ('new' as const)
          : { rounded: 0, sign: 0 as const };
    change = { differenceCents, percent };
  }
  return { day, selectedCents, previousCents, change };
}
