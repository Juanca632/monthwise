# Data Model: Monthly charts and insights

Phase 1 output for [plan.md](plan.md). **Nothing new is stored** (FR-025): no migration, schema
version stays 1, and the `transactions` table of
[001's data model](../001-monthly-summary/data-model.md) is the only source. Everything below is
derived when a view is shown (FR-018). All amounts are integer cents; the exact function
signatures are in [contracts/insights-domain.md](contracts/insights-domain.md).

## Input: LedgerRow

What `listRange` returns (contracts/transaction-repository.md) and every function below reads.

| Field         | Type                      | Notes                                           |
| ------------- | ------------------------- | ----------------------------------------------- |
| `type`        | `'income' \| 'expense'`   | Only expenses count as spending                 |
| `amountCents` | integer, 1..99,999,999    | As stored                                       |
| `date`        | `YYYY-MM-DD`              | The row belongs to this date's month (FR-016)   |
| `category`    | category key              | Valid for `type` (001 data model, Category)     |

## Shared terms

| Term | Rule | Spec |
| --- | --- | --- |
| Month has data | At least one row (income or expense) dated in the month | Terms, "No data" |
| Spent by day N | Sum of the month's expense rows dated day 1..N; N past the month's last day means the whole month | Terms |
| Comparison day | Current month only: today's day of the month. `null` for a past month | Terms |
| Previous month's comparison | By `min(comparison day, previous month's last day)` | Edge Cases |
| Line end (selected month) | Past month: its last day. Current month: the later of today's day and the day of its latest row dated after today. Any type counts for the line's length; a later-dated income only extends the line flat (it is never spending) | FR-002, FR-007 |
| Chart days | `max(days in selected month, days in previous month)`, which is always 31: any two consecutive months include a 31-day one (January 2000's previous month, December 1999, has 31 days too). Day 29 or 30 may exist in neither month (February against January) | FR-006 |
| Saved | Income − expenses (can be negative) | Terms |

## Percent

| Field     | Type            | Notes |
| --------- | --------------- | ----- |
| `rounded` | integer         | Whole percent, rounded half away from zero (FR-017; research R4); never `-0` |
| `sign`    | `-1 \| 0 \| 1`  | Sign of the exact value; with `rounded === 0` and `sign !== 0` it shows as "<1%" ("+<1%", "-<1%") |

A change percent is a `Percent`, or `'new'` when last month's amount is 0 and this month's is
above 0 ("New"). Both 0 gives `{ rounded: 0, sign: 0 }` ("0%"). A savings rate is a `Percent`,
or `null` when income is 0 ("No income").

## Pace

| Field | Type | Notes |
| --- | --- | --- |
| `selected` | `DailySeries` | Selected month, days 1..line end |
| `previous` | `DailySeries \| null` | Whole previous month; `null` when it has no data (only one line drawn) |
| `chartDays` | integer, always 31 (Shared terms) | Chart spans day 1..`chartDays` |
| `comparisonDay` | integer \| `null` | `null` for a past month |
| `sentence` | `PaceSentence` | The first FR-003 rule that applies |

`DailySeries`: `{ month: YearMonth; cumulativeCents: number[] }`, where `cumulativeCents[i]` is
spent by day `i + 1` and the array length is the line's last day.

`PaceSentence`, in FR-003's order:

| `kind` | When | Extra fields |
| --- | --- | --- |
| `noSpending` | No expenses in either month (by the comparison day for the current month; whole months otherwise) | — |
| `noPreviousData` | Previous month has no data | `previousMonth`, `isCurrent` (chooses "last month" or the month's name) |
| `more`, `less`, `same` | Otherwise | `differenceCents` (absolute), `comparisonDay` or `previousMonth` |

`DayDetail` (FR-007), for a day 1..`chartDays`:

| Field | Type | Notes |
| --- | --- | --- |
| `day` | integer | "Day N" |
| `selectedCents` | integer \| `null` | `null` when the day is after the line end or past the selected month's last day |
| `previousCents` | integer \| `null` | `null` when the previous month has no data; past its last day it is the whole month |
| `change` | `{ differenceCents, percent: Percent \| 'new' }` \| `null` | Only when both amounts exist; percent of `previousCents` |

## CategoryComparison (FR-008 to FR-010)

| `kind` | When (first that applies) | Rows |
| --- | --- | --- |
| `noSpending` | Neither month has expenses (by the comparison day for the current month) | none |
| `noPreviousData` | Previous month has no data | `{ category, amountCents }[]`, this month only (by the comparison day for the current month), largest first, ties by label |
| `changes` | Otherwise | `CategoryChange[]`, plus `comparisonDay` (`null` for a past month) |

`CategoryChange`: `{ category, currentCents, previousCents, changeCents, percent: Percent | 'new' }`.
Listed when `currentCents > 0` or `previousCents > 0`; ordered by `changeCents` descending, ties by
category label in plain code-unit order (as 001's breakdown, so every phone sorts the same).

## Trend (FR-011 to FR-013)

`MonthTotals`: `{ month, hasData, incomeCents, expenseCents, savedCents, rate: Percent | null }`.

| Field | Type | Notes |
| --- | --- | --- |
| `months` | `MonthTotals[]` | Selected month and up to five before it, calendar order, never before January 2000 |
| `monthsWithData` | integer 0..6 | The headline's N |
| `totalSavedCents` | integer | Sum of `savedCents` over all months shown (no-data months add 0) |
| `rate` | `Percent \| null` | Total saved / total income; `null` when total income is 0 |

`monthsWithData === 0` means "No data yet": no chart and no headline.

## Month picker (FR-027)

`PickerYear`: `{ year, canGoPrevious, canGoNext, months: { month: YearMonth; selected: boolean;
available: boolean }[] }`. `canGoPrevious` is false on 2000, `canGoNext` false on the current
year; a month is available when it is not after the current month.

## UI state (not data)

| State | Where | Rules |
| --- | --- | --- |
| Selected day | Pace chart | `null` on open; tap toggles, drag sets, month change resets (FR-014, FR-031) |
| Selected trend month | Trend | Same rules as the selected day; "View month" also resets it (FR-030) |
| Selected month | `SelectedMonthContext` | Unchanged from 001, now set by the picker, "View month", saves (001 FR-020) and the midnight rollover (FR-029, FR-031) |
