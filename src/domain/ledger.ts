import type { TransactionType } from './categories';
import { monthOf, type IsoDate, type YearMonth } from './month';

/** The slim row the insights read: no id, note or creation time (contracts/insights-domain.md). */
export type LedgerRow = {
  type: TransactionType;
  amountCents: number;
  date: IsoDate;
  category: string;
};

/** Splits one range read into a month's rows, keeping their order (date, then id). */
export function rowsInMonth(rows: readonly LedgerRow[], ym: YearMonth): LedgerRow[] {
  return rows.filter((row) => {
    const m = monthOf(row.date);
    return m.year === ym.year && m.month === ym.month;
  });
}
