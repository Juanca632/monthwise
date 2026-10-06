import type { TransactionType } from '@/domain/categories';
import type { IsoDate } from '@/domain/month';

/** The fields of a stored transaction that day groups need. */
export type DayRow = { date: IsoDate; type: TransactionType; amountCents: number };

export type DayGroup<T extends DayRow> = {
  date: IsoDate;
  /** The day's income minus its expenses, in cents. */
  netCents: number;
  rows: T[];
};

/**
 * The month's rows by day, in the order given (FR-017: the query already lists them newest date
 * first, and the most recently recorded first within a day).
 */
export function groupByDay<T extends DayRow>(rows: readonly T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const row of rows) {
    let group = groups.at(-1);
    if (group?.date !== row.date) {
      group = { date: row.date, netCents: 0, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
    group.netCents += row.type === 'income' ? row.amountCents : -row.amountCents;
  }
  return groups;
}
