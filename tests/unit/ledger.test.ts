import { rowsInMonth, type LedgerRow } from '@/domain/ledger';

const row = (date: string, amountCents = 100): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});

describe('rowsInMonth', () => {
  it("keeps the month's first and last day and drops the neighbours", () => {
    const rows = [row('2026-08-31'), row('2026-09-01'), row('2026-09-30'), row('2026-10-01')];
    expect(rowsInMonth(rows, { year: 2026, month: 9 }).map((r) => r.date)).toEqual([
      '2026-09-01',
      '2026-09-30',
    ]);
  });

  it('splits December and January across a year end', () => {
    const rows = [row('2025-12-31', 1), row('2026-01-01', 2), row('2026-12-31', 3)];
    expect(rowsInMonth(rows, { year: 2025, month: 12 }).map((r) => r.amountCents)).toEqual([1]);
    expect(rowsInMonth(rows, { year: 2026, month: 1 }).map((r) => r.amountCents)).toEqual([2]);
  });

  it('keeps the input order and returns [] for a month without rows', () => {
    const rows = [row('2026-09-20', 1), row('2026-09-03', 2), row('2026-09-20', 3)];
    expect(rowsInMonth(rows, { year: 2026, month: 9 }).map((r) => r.amountCents)).toEqual([1, 2, 3]);
    expect(rowsInMonth(rows, { year: 2026, month: 6 })).toEqual([]);
  });
});
