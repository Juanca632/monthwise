import { labelFor, type ExpenseCategory, type TransactionType } from '@/domain/categories';

/** The fields of a stored transaction that the summary needs. */
export type SummaryRow = { type: TransactionType; amountCents: number; category: string };

export type BreakdownItem = {
  category: ExpenseCategory;
  amountCents: number;
  percent: number;
  percentLabel: string;
};

export type Summary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  breakdown: BreakdownItem[];
};

// Rounds 100 × part / total half up with integers only: n / d equals that value + 0.5, and
// subtracting the remainder makes the division exact (research R5).
function roundedPercent(partCents: number, totalCents: number): number {
  const n = 200 * partCents + totalCents;
  const d = 2 * totalCents;
  return (n - (n % d)) / d;
}

export function computeSummary(rows: readonly SummaryRow[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<ExpenseCategory, number>();

  for (const row of rows) {
    if (row.type === 'income') {
      incomeCents += row.amountCents;
    } else {
      expenseCents += row.amountCents;
      // Stored categories are valid for their type (database CHECK), so the cast is safe.
      const category = row.category as ExpenseCategory;
      byCategory.set(category, (byCategory.get(category) ?? 0) + row.amountCents);
    }
  }

  const breakdown = [...byCategory]
    .filter(([, amountCents]) => amountCents > 0)
    .map(([category, amountCents]): BreakdownItem => {
      const percent = roundedPercent(amountCents, expenseCents);
      return { category, amountCents, percent, percentLabel: percent === 0 ? '<1%' : `${percent}%` };
    })
    .sort((a, b) => {
      if (a.amountCents !== b.amountCents) return b.amountCents - a.amountCents;
      // Plain code-unit order, not localeCompare, so ties sort the same on every phone.
      const la = labelFor('expense', a.category);
      const lb = labelFor('expense', b.category);
      return la < lb ? -1 : la > lb ? 1 : 0;
    });

  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, breakdown };
}
