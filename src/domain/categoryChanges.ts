import { labelFor, type ExpenseCategory } from './categories';
import type { LedgerRow } from './ledger';
import {
  isCurrentMonth,
  monthOf,
  previous as previousMonthOf,
  type IsoDate,
  type YearMonth,
} from './month';
import { percentOf, type Percent } from './percent';

export type CategoryChange = {
  category: ExpenseCategory;
  currentCents: number;
  previousCents: number;
  /** current - previous. */
  changeCents: number;
  percent: Percent | 'new';
};

export type CategoryComparison =
  | { kind: 'noSpending' }
  | {
      kind: 'noPreviousData';
      previousMonth: YearMonth;
      isCurrent: boolean;
      rows: { category: ExpenseCategory; amountCents: number }[];
    }
  | { kind: 'changes'; comparisonDay: number | null; rows: CategoryChange[] };

const dayOf = (iso: IsoDate): number => Number(iso.slice(8, 10));

const inMonth = (row: LedgerRow, ym: YearMonth): boolean => {
  const m = monthOf(row.date);
  return m.year === ym.year && m.month === ym.month;
};

/** Plain code-unit order of the 001 labels, as the breakdown, so every phone sorts the same. */
const byLabel = (a: ExpenseCategory, b: ExpenseCategory): number => {
  const la = labelFor('expense', a);
  const lb = labelFor('expense', b);
  return la < lb ? -1 : la > lb ? 1 : 0;
};

/** Each category's expenses in `ym`, up to `lastDay` (a day past the month's end counts it all). */
function spendingByCategory(
  rows: readonly LedgerRow[],
  ym: YearMonth,
  lastDay: number,
): Map<ExpenseCategory, number> {
  const totals = new Map<ExpenseCategory, number>();
  for (const row of rows) {
    if (row.type !== 'expense' || !inMonth(row, ym) || dayOf(row.date) > lastDay) continue;
    // Stored categories are valid for their type (database CHECK), so the cast is safe.
    const category = row.category as ExpenseCategory;
    totals.set(category, (totals.get(category) ?? 0) + row.amountCents);
  }
  return totals;
}

/**
 * FR-008 to FR-010. For the current month every amount, including the `noPreviousData` rows and
 * the `noSpending` check, counts both months by the comparison day, so a month still running is
 * not compared against a finished one; rows dated after today are left out. A past month uses
 * both whole months.
 */
export function compareCategories(
  selected: YearMonth,
  selectedRows: readonly LedgerRow[],
  previousRows: readonly LedgerRow[],
  today: IsoDate,
): CategoryComparison {
  const previousMonth = previousMonthOf(selected);
  const isCurrent = isCurrentMonth(selected, today);
  const comparisonDay = isCurrent ? dayOf(today) : null;
  // Day 31 is past every month's end, so it counts whole months. Against a shorter previous
  // month the comparison day also counts it whole (spec Edge Cases).
  const lastDay = comparisonDay ?? 31;

  const current = spendingByCategory(selectedRows, selected, lastDay);
  const previous = spendingByCategory(previousRows, previousMonth, lastDay);

  // FR-008: this rule wins over FR-010.
  if (current.size === 0 && previous.size === 0) return { kind: 'noSpending' };

  // "No data" means no rows of any type in the whole month, as the pace's (FR-003 rule 2).
  const hasPrevious = previousRows.some((row) => inMonth(row, previousMonth));
  if (!hasPrevious) {
    const rows = [...current]
      .map(([category, amountCents]) => ({ category, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents || byLabel(a.category, b.category));
    return { kind: 'noPreviousData', previousMonth, isCurrent, rows };
  }

  const categories = new Set([...current.keys(), ...previous.keys()]);
  const rows = [...categories]
    .map((category): CategoryChange => {
      const currentCents = current.get(category) ?? 0;
      const previousCents = previous.get(category) ?? 0;
      const changeCents = currentCents - previousCents;
      return {
        category,
        currentCents,
        previousCents,
        changeCents,
        percent: previousCents > 0 ? percentOf(changeCents, previousCents) : 'new',
      };
    })
    .sort((a, b) => b.changeCents - a.changeCents || byLabel(a.category, b.category));
  return { kind: 'changes', comparisonDay, rows };
}
