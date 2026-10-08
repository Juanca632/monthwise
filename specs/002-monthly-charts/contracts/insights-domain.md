# Contract: Insights domain functions

Pure TypeScript, no React, Expo or SQLite (principle II, AGENTS.md). Acceptance and unit tests
may import these modules directly to check numbers in cents (SC-001). Types and rules are
explained in [../data-model.md](../data-model.md); this file fixes the public surface.

```ts
// Existing (001): src/domain/month.ts
type YearMonth = { year: number; month: number }; // month 1..12
type IsoDate = string;                             // 'YYYY-MM-DD'
// Existing (001): src/domain/categories.ts
type TransactionType = 'income' | 'expense';
type ExpenseCategory = 'food' | 'transport' | 'housing' | 'bills' | 'health' | 'shopping' | 'leisure' | 'other';
```

## `src/domain/ledger.ts`

```ts
export type LedgerRow = {
  type: TransactionType;
  amountCents: number;   // integer
  date: IsoDate;
  category: string;
};
```

## `src/domain/percent.ts`

```ts
export type Percent = { rounded: number; sign: -1 | 0 | 1 }; // `rounded` is never -0

/** Whole percent of part / whole, half away from zero. `whole` must be > 0. */
export function percentOf(partCents: number, wholeCents: number): Percent;
```

Examples: `percentOf(3_000, 8_000)` → `{ rounded: 38, sign: 1 }`; `percentOf(-3_000, 8_000)` →
`{ rounded: -38, sign: -1 }`; `percentOf(1, 100_000)` → `{ rounded: 0, sign: 1 }`;
`percentOf(0, 5)` → `{ rounded: 0, sign: 0 }`; `percentOf(-1, 100_000)` → `{ rounded: 0, sign: -1 }`
(`rounded` is `0`, not `-0`).

## `src/domain/month.ts` (additions)

```ts
export function addMonths(ym: YearMonth, delta: number): YearMonth;   // delta may be negative
export function daysInMonth(ym: YearMonth): number;                    // 28..31
export function compareMonths(a: YearMonth, b: YearMonth): number;     // <0, 0, >0

export type PickerYear = {
  year: number;
  canGoPrevious: boolean;  // false on 2000
  canGoNext: boolean;      // false on today's year
  months: { month: YearMonth; selected: boolean; available: boolean }[]; // 12, January first
};
export function pickerYear(year: number, selected: YearMonth, today: IsoDate): PickerYear;
```

`isMinMonth`, `previous`, `next`, `lastDayOf`, `isCurrentMonth` and `MIN_MONTH` stay as in 001.

## `src/domain/pace.ts`

```ts
export type DailySeries = { month: YearMonth; cumulativeCents: number[] }; // [i] = spent by day i+1

export type PaceSentence =
  | { kind: 'noSpending' }
  | { kind: 'noPreviousData'; previousMonth: YearMonth; isCurrent: boolean }
  | { kind: 'more' | 'less' | 'same'; differenceCents: number;            // absolute, ≥ 0
      comparisonDay: number | null; previousMonth: YearMonth };

export type Pace = {
  selected: DailySeries;
  previous: DailySeries | null;   // null: previous month has no data
  chartDays: number;              // always 31 (any two consecutive months include a 31-day one)
  comparisonDay: number | null;   // null: past month
  sentence: PaceSentence;
};

export type DayDetail = {
  day: number;
  selectedCents: number | null;
  previousCents: number | null;
  change: { differenceCents: number; percent: Percent | 'new' } | null;
};

/**
 * `selectedRows` are the selected month's rows, `previousRows` the previous month's (any type,
 * any order). `today` decides whether the selected month is the current month.
 *
 * Line end of `selected` (length of `selected.cumulativeCents`): a past month's last day; for the
 * current month, the later of today's day and the day of the latest row dated after today. Rows of
 * any type count for that length, but only expenses add to the amounts: a later-dated income makes
 * the line run on flat to its date. The sentence and the comparison use only days up to the
 * comparison day (today's day; the previous month up to min(today's day, its last day)).
 */
export function computePace(
  selected: YearMonth,
  selectedRows: readonly LedgerRow[],
  previousRows: readonly LedgerRow[],
  today: IsoDate,
): Pace;

/**
 * `selectedCents` is null after the line end or past the selected month's last day;
 * `previousCents` is null when the previous month has no data, and its whole month past its last
 * day; `change` only when both exist (percent of `previousCents`, 'new' when it is 0 and the
 * selected amount is above 0, 0% when both are 0).
 */
export function dayDetail(pace: Pace, day: number): DayDetail; // day 1..pace.chartDays
```

## `src/domain/categoryChanges.ts`

```ts
export type CategoryChange = {
  category: ExpenseCategory;
  currentCents: number;
  previousCents: number;
  changeCents: number;              // current - previous
  percent: Percent | 'new';
};

export type CategoryComparison =
  | { kind: 'noSpending' }
  | { kind: 'noPreviousData'; previousMonth: YearMonth; isCurrent: boolean;
      rows: { category: ExpenseCategory; amountCents: number }[] }
  | { kind: 'changes'; comparisonDay: number | null; rows: CategoryChange[] };

/**
 * For the current month every amount, including the `noPreviousData` rows and the `noSpending`
 * check, counts both months by the comparison day (the previous month up to min(today's day, its
 * last day)); rows dated after today are left out. A past month uses both whole months.
 */
export function compareCategories(
  selected: YearMonth,
  selectedRows: readonly LedgerRow[],
  previousRows: readonly LedgerRow[],
  today: IsoDate,
): CategoryComparison;
```

## `src/domain/trend.ts`

```ts
export type MonthTotals = {
  month: YearMonth;
  hasData: boolean;
  incomeCents: number;
  expenseCents: number;
  savedCents: number;
  rate: Percent | null;            // null: no income
};

export type Trend = {
  months: MonthTotals[];           // calendar order, 1..6 months
  monthsWithData: number;
  totalSavedCents: number;
  rate: Percent | null;            // null: no income over the months shown
};

/** First month of the trend: five months before `selected`, never before January 2000. */
export function trendStart(selected: YearMonth): YearMonth;

/** `rows` may contain any months; only those from trendStart(selected) to selected count. */
export function computeTrend(selected: YearMonth, rows: readonly LedgerRow[]): Trend;
```

## Guarantees checked by unit tests

- Every amount is exact to the cent; no function uses floats for money (FR-016, principle III).
- The SC-001 reference set (`tests/fixtures/insightsReference.ts`: at least seven months and 100
  transactions, including 31- vs 28/29/30-day months, months without data, negative savings and
  rows moved between months) matches hand-written expected cents for every function above.
- Percent rounding at ±0.5, ±37.5, values under 0.5 % of either sign, and FR-022's largest totals.
