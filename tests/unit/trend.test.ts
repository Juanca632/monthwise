import type { LedgerRow } from '@/domain/ledger';
import type { IsoDate, YearMonth } from '@/domain/month';
import { computeTrend, trendStart } from '@/domain/trend';
import {
  insightsReference2024,
  insightsReference2026,
  type InsightsEdit,
} from '../fixtures/insightsReference';

const OCT: YearMonth = { year: 2026, month: 10 };

const expense = (date: IsoDate, amountCents: number): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
});
const income = (date: IsoDate, amountCents: number): LedgerRow => ({
  type: 'income',
  amountCents,
  date,
  category: 'salary',
});

const monthOfTrend = (rows: LedgerRow[], month: number) =>
  computeTrend(OCT, rows).months.find((m) => m.month.month === month && m.month.year === 2026)!;

describe('trendStart', () => {
  it('is five months before the selected month', () => {
    expect(trendStart(OCT)).toEqual({ year: 2026, month: 5 });
    expect(trendStart({ year: 2026, month: 3 })).toEqual({ year: 2025, month: 10 });
  });

  it('is never before January 2000', () => {
    expect(trendStart({ year: 2000, month: 2 })).toEqual({ year: 2000, month: 1 });
  });
});

describe('computeTrend: US3 scenarios', () => {
  it('1: October shows May to October in calendar order', () => {
    expect(computeTrend(OCT, []).months.map((m) => m.month.month)).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it('2: 12,000.00 income and 10,200.00 expenses over six months: saved 1,800.00, 15%', () => {
    const rows = [5, 6, 7, 8, 9, 10].flatMap((m) => [
      income(`2026-${String(m).padStart(2, '0')}-01`, 200_000),
      expense(`2026-${String(m).padStart(2, '0')}-02`, 170_000),
    ]);
    const trend = computeTrend(OCT, rows);
    expect(trend).toMatchObject({ monthsWithData: 6, totalSavedCents: 180_000, rate: { rounded: 15, sign: 1 } });
  });

  it('3: September with 2,000.00 in and 1,700.00 out saved 300.00, 15%', () => {
    const sep = monthOfTrend([income('2026-09-01', 200_000), expense('2026-09-02', 170_000)], 9);
    expect(sep).toEqual({
      month: { year: 2026, month: 9 },
      hasData: true,
      incomeCents: 200_000,
      expenseCents: 170_000,
      savedCents: 30_000,
      rate: { rounded: 15, sign: 1 },
    });
  });

  it('4: August spending more than it earned saved -150.00, -8% (half away from zero)', () => {
    const aug = monthOfTrend([income('2026-08-01', 200_000), expense('2026-08-02', 215_000)], 8);
    expect(aug).toMatchObject({ savedCents: -15_000, rate: { rounded: -8, sign: -1 } });
  });

  it('5: July with expenses and no income has no rate', () => {
    const jul = monthOfTrend([expense('2026-07-02', 40_000)], 7);
    expect(jul).toMatchObject({ hasData: true, savedCents: -40_000, rate: null });
  });

  it('6: a month with no data is marked so, not zero', () => {
    expect(monthOfTrend([expense('2026-07-02', 40_000)], 6)).toEqual({
      month: { year: 2026, month: 6 },
      hasData: false,
      incomeCents: 0,
      expenseCents: 0,
      savedCents: 0,
      rate: null,
    });
  });

  it('6: a month with only income has data', () => {
    expect(monthOfTrend([income('2026-06-01', 1_000)], 6)).toMatchObject({ hasData: true, rate: { rounded: 100, sign: 1 } });
  });

  it('7: February 2000 shows two months; January 2000 one', () => {
    const rows = [income('2000-01-01', 1_000), income('2000-02-01', 1_000)];
    expect(computeTrend({ year: 2000, month: 2 }, rows)).toMatchObject({ monthsWithData: 2 });
    expect(computeTrend({ year: 2000, month: 2 }, rows).months).toHaveLength(2);
    expect(computeTrend({ year: 2000, month: 1 }, rows)).toMatchObject({ monthsWithData: 1 });
  });

  it('8: only September and October with data: 300.00 in 2 months, 10%', () => {
    const rows = [
      income('2026-09-01', 100_000),
      expense('2026-09-02', 90_000),
      income('2026-10-01', 200_000),
      expense('2026-10-02', 180_000),
    ];
    const trend = computeTrend(OCT, rows);
    expect(trend.months.map((m) => m.hasData)).toEqual([false, false, false, false, true, true]);
    expect(trend).toMatchObject({ monthsWithData: 2, totalSavedCents: 30_000, rate: { rounded: 10, sign: 1 } });
  });

  it('9: only October with 400.00 of expenses: -400.00 in 1 month, no income', () => {
    expect(computeTrend(OCT, [expense('2026-10-02', 40_000)])).toMatchObject({
      monthsWithData: 1,
      totalSavedCents: -40_000,
      rate: null,
    });
  });
});

describe('computeTrend: edges', () => {
  it('every month without data', () => {
    expect(computeTrend(OCT, [])).toMatchObject({ monthsWithData: 0, totalSavedCents: 0, rate: null });
  });

  it('crosses a year boundary: February 2026 starts in September 2025', () => {
    const trend = computeTrend({ year: 2026, month: 2 }, [income('2025-12-01', 1_000), income('2026-01-01', 2_000)]);
    expect(trend.months.map((m) => [m.month.year, m.month.month, m.incomeCents])).toEqual([
      [2025, 9, 0],
      [2025, 10, 0],
      [2025, 11, 0],
      [2025, 12, 1_000],
      [2026, 1, 2_000],
      [2026, 2, 0],
    ]);
  });

  it('ignores rows outside the six months', () => {
    const trend = computeTrend(OCT, [income('2026-04-30', 1_000), income('2026-11-01', 1_000), income('2026-05-01', 500)]);
    expect(trend).toMatchObject({ monthsWithData: 1, totalSavedCents: 500 });
  });

  it('counts a row dated after today, as 001 totals do (it does not depend on today)', () => {
    expect(monthOfTrend([expense('2026-10-30', 1_000)], 10)).toMatchObject({ expenseCents: 1_000 });
  });

  it('FR-022: six months of 999,999,999.99 each stay exact integers', () => {
    const max = 99_999_999_999;
    const rows = [5, 6, 7, 8, 9, 10].map((m) => income(`2026-${String(m).padStart(2, '0')}-01`, max));
    const trend = computeTrend(OCT, rows);
    expect(trend.totalSavedCents).toBe(6 * max);
    expect(Number.isSafeInteger(trend.totalSavedCents)).toBe(true);
    expect(trend.rate).toEqual({ rounded: 100, sign: 1 });
  });
});

describe('computeTrend: SC-001 reference set (T008 literals)', () => {
  type Input = (typeof insightsReference2026.inputs)[number];
  const ledger = (inputs: readonly Input[], edits: readonly InsightsEdit[]): LedgerRow[] => {
    const edited = [...inputs];
    for (const { index, input } of edits) edited[index] = input;
    return edited.map(({ type, amountCents, date, category }) => ({ type, amountCents, date, category }));
  };

  it('October 2026', () => {
    const rows = ledger(insightsReference2026.inputs, insightsReference2026.edits);
    expect(computeTrend(OCT, rows)).toEqual(insightsReference2026.expected.trendOctober);
  });

  it('June 2026 (a month without data, five months back into a year without data)', () => {
    const rows = ledger(insightsReference2026.inputs, insightsReference2026.edits);
    expect(computeTrend({ year: 2026, month: 6 }, rows)).toEqual(insightsReference2026.expected.trendJune);
  });

  it('March 2024', () => {
    const rows = ledger(insightsReference2024.inputs, insightsReference2024.edits);
    expect(computeTrend({ year: 2024, month: 3 }, rows)).toEqual(insightsReference2024.expected.trendMarch);
  });
});
