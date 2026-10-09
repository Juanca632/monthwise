import type { LedgerRow } from './ledger';
import { addMonths, compareMonths, MIN_MONTH, monthOf, type YearMonth } from './month';
import { percentOf, type Percent } from './percent';

export type MonthTotals = {
  month: YearMonth;
  hasData: boolean;
  incomeCents: number;
  expenseCents: number;
  savedCents: number;
  /** `null`: no income. */
  rate: Percent | null;
};

export type Trend = {
  /** Calendar order, 1..6 months. */
  months: MonthTotals[];
  monthsWithData: number;
  totalSavedCents: number;
  /** `null`: no income over the months shown. */
  rate: Percent | null;
};

/** Months in the trend: the selected month and the five before it (FR-011). */
const TREND_MONTHS = 6;

/** First month of the trend: five months before `selected`, never before January 2000. */
export function trendStart(selected: YearMonth): YearMonth {
  const start = addMonths(selected, -(TREND_MONTHS - 1));
  return compareMonths(start, MIN_MONTH) < 0 ? MIN_MONTH : start;
}

/** Saved over income; no income has no rate ("No income"), not 0 %. */
const rateOf = (savedCents: number, incomeCents: number): Percent | null =>
  incomeCents > 0 ? percentOf(savedCents, incomeCents) : null;

/**
 * FR-011, FR-012. `rows` may contain any months; only those from trendStart(selected) to selected
 * count. Rows dated after today count too, as in 001's totals, so the result does not depend on
 * today (spec Edge Cases).
 */
export function computeTrend(selected: YearMonth, rows: readonly LedgerRow[]): Trend {
  const first = trendStart(selected);
  const months: MonthTotals[] = [];
  for (let m = first; compareMonths(m, selected) <= 0; m = addMonths(m, 1)) {
    months.push({ month: m, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null });
  }

  for (const row of rows) {
    const ym = monthOf(row.date);
    // Also keeps the index below inside `months`.
    if (compareMonths(ym, first) < 0 || compareMonths(ym, selected) > 0) continue;
    const totals = months[(ym.year - first.year) * 12 + (ym.month - first.month)];
    // "No data" means no rows of any type, as everywhere in 002.
    totals.hasData = true;
    if (row.type === 'income') totals.incomeCents += row.amountCents;
    else totals.expenseCents += row.amountCents;
  }

  let monthsWithData = 0;
  let totalIncomeCents = 0;
  let totalSavedCents = 0;
  for (const totals of months) {
    totals.savedCents = totals.incomeCents - totals.expenseCents;
    totals.rate = rateOf(totals.savedCents, totals.incomeCents);
    if (totals.hasData) monthsWithData++;
    totalIncomeCents += totals.incomeCents;
    totalSavedCents += totals.savedCents;
  }

  return { months, monthsWithData, totalSavedCents, rate: rateOf(totalSavedCents, totalIncomeCents) };
}
