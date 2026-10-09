import { compareCategories } from '@/domain/categoryChanges';
import { rowsInMonth, type LedgerRow } from '@/domain/ledger';
import { previous, type IsoDate, type YearMonth } from '@/domain/month';
import {
  insightsReference2024,
  insightsReference2026,
  type InsightsEdit,
} from '../fixtures/insightsReference';

const OCT: YearMonth = { year: 2026, month: 10 };
const SEP: YearMonth = { year: 2026, month: 9 };
const AUG: YearMonth = { year: 2026, month: 8 };
const TODAY: IsoDate = '2026-10-12';

const expense = (date: IsoDate, amountCents: number, category = 'food'): LedgerRow => ({
  type: 'expense',
  amountCents,
  date,
  category,
});
const income = (date: IsoDate, amountCents: number): LedgerRow => ({
  type: 'income',
  amountCents,
  date,
  category: 'salary',
});

/** September against August: a past month, whole months (scenarios 1-6 and 8). */
const past = (selectedRows: LedgerRow[], previousRows: LedgerRow[]) =>
  compareCategories(SEP, selectedRows, previousRows, TODAY);

const rowOf = (comparison: ReturnType<typeof past>, category: string) =>
  comparison.kind === 'changes' ? comparison.rows.find((r) => r.category === category) : undefined;

describe('compareCategories: US2 scenarios', () => {
  it('1: Food from 200.00 to 260.00 is +60.00, +30%', () => {
    const result = past([expense('2026-09-03', 26_000)], [expense('2026-08-03', 20_000)]);
    expect(rowOf(result, 'food')).toEqual({
      category: 'food',
      currentCents: 26_000,
      previousCents: 20_000,
      changeCents: 6_000,
      percent: { rounded: 30, sign: 1 },
    });
  });

  it('2: Transport from 80.00 to 50.00 is -30.00, -38% (half away from zero)', () => {
    const result = past([expense('2026-09-03', 5_000, 'transport')], [expense('2026-08-03', 8_000, 'transport')]);
    expect(rowOf(result, 'transport')).toMatchObject({ changeCents: -3_000, percent: { rounded: -38, sign: -1 } });
  });

  it('3: Leisure with nothing last month is New', () => {
    const result = past([expense('2026-09-03', 4_000, 'leisure')], [expense('2026-08-03', 1_000)]);
    expect(rowOf(result, 'leisure')).toMatchObject({ previousCents: 0, changeCents: 4_000, percent: 'new' });
  });

  it('4: Health with nothing this month is 0.00, -25.00, -100%', () => {
    const result = past([expense('2026-09-03', 1_000)], [expense('2026-08-03', 2_500, 'health')]);
    expect(rowOf(result, 'health')).toMatchObject({
      currentCents: 0,
      changeCents: -2_500,
      percent: { rounded: -100, sign: -1 },
    });
  });

  it('5: rows are ordered by change, largest increase first; ties alphabetically by label', () => {
    const result = past(
      [
        expense('2026-09-03', 26_000),
        expense('2026-09-03', 4_000, 'leisure'),
        expense('2026-09-03', 1_000, 'bills'),
        expense('2026-09-03', 1_000, 'other'),
        expense('2026-09-03', 5_000, 'transport'),
        // Housing and Shopping tie at +10.00, Bills and Other at 0: each pair sorts by label.
        expense('2026-09-03', 1_000, 'shopping'),
        expense('2026-09-03', 1_000, 'housing'),
      ],
      [
        expense('2026-08-03', 20_000),
        expense('2026-08-03', 1_000, 'bills'),
        expense('2026-08-03', 1_000, 'other'),
        expense('2026-08-03', 8_000, 'transport'),
      ],
    );
    expect(result.kind === 'changes' && result.rows.map((r) => [r.category, r.changeCents])).toEqual([
      ['food', 6_000],
      ['leisure', 4_000],
      ['housing', 1_000],
      ['shopping', 1_000],
      ['bills', 0],
      ['other', 0],
      ['transport', -3_000],
    ]);
  });

  it('6: a category with no expenses in either month is not listed', () => {
    const result = past([expense('2026-09-03', 1_000)], [expense('2026-08-03', 1_000)]);
    expect(result.kind === 'changes' && result.rows.map((r) => r.category)).toEqual(['food']);
  });

  it('7: no data last month (current month): this month only, largest first, ties by label', () => {
    const result = compareCategories(
      OCT,
      [expense('2026-10-02', 3_000, 'transport'), expense('2026-10-03', 9_000), expense('2026-10-04', 3_000, 'bills')],
      [],
      TODAY,
    );
    expect(result).toEqual({
      kind: 'noPreviousData',
      previousMonth: SEP,
      isCurrent: true,
      rows: [
        { category: 'food', amountCents: 9_000 },
        { category: 'bills', amountCents: 3_000 },
        { category: 'transport', amountCents: 3_000 },
      ],
    });
  });

  it('7, past month: names the previous month and is not current', () => {
    const result = past([expense('2026-09-03', 1_000)], []);
    expect(result).toMatchObject({ kind: 'noPreviousData', previousMonth: AUG, isCurrent: false });
  });

  it('8: no expenses in either month is noSpending, even when the previous month has no data', () => {
    expect(past([income('2026-09-01', 100_000)], [income('2026-08-01', 100_000)])).toEqual({ kind: 'noSpending' });
    expect(past([], [])).toEqual({ kind: 'noSpending' });
  });

  it('9: the current month counts both months by the comparison day', () => {
    const result = compareCategories(
      OCT,
      [expense('2026-10-01', 4_000), expense('2026-10-12', 6_000)],
      [expense('2026-09-01', 9_000), expense('2026-09-13', 17_000)],
      TODAY,
    );
    expect(result).toEqual({
      kind: 'changes',
      comparisonDay: 12,
      rows: [
        {
          category: 'food',
          currentCents: 10_000,
          previousCents: 9_000,
          changeCents: 1_000,
          percent: { rounded: 11, sign: 1 },
        },
      ],
    });
  });
});

describe('compareCategories: edge cases', () => {
  it('leaves out a row dated after today until its date', () => {
    const result = compareCategories(
      OCT,
      [expense('2026-10-05', 1_000), expense('2026-10-15', 3_000, 'leisure')],
      [expense('2026-09-05', 1_000)],
      TODAY,
    );
    expect(result.kind === 'changes' && result.rows.map((r) => r.category)).toEqual(['food']);
  });

  it('noSpending for the current month counts by the comparison day', () => {
    const result = compareCategories(OCT, [], [expense('2026-09-20', 8_000)], TODAY);
    expect(result).toEqual({ kind: 'noSpending' });
  });

  it('a 29-day February as previous month on day 30 counts it whole', () => {
    const result = compareCategories(
      { year: 2024, month: 3 },
      [expense('2024-03-30', 1_000)],
      [expense('2024-02-29', 2_000)],
      '2024-03-30',
    );
    expect(result).toMatchObject({ kind: 'changes', comparisonDay: 30, rows: [{ previousCents: 2_000 }] });
  });

  it('a past month counts its whole month, whatever the dates', () => {
    const result = past([expense('2026-09-30', 1_000)], [expense('2026-08-31', 1_000)]);
    expect(result).toMatchObject({ kind: 'changes', comparisonDay: null, rows: [{ changeCents: 0 }] });
  });
});

describe('compareCategories: SC-001 reference set (T008 literals)', () => {
  type Input = (typeof insightsReference2026.inputs)[number];
  const ledger = (inputs: readonly Input[], edits: readonly InsightsEdit[]): LedgerRow[] => {
    const edited = [...inputs];
    for (const { index, input } of edits) edited[index] = input;
    return edited.map(({ type, amountCents, date, category }) => ({ type, amountCents, date, category }));
  };
  const compareFor = (rows: LedgerRow[], ym: YearMonth, today: IsoDate) =>
    compareCategories(ym, rowsInMonth(rows, ym), rowsInMonth(rows, previous(ym)), today);

  const rows2026 = ledger(insightsReference2026.inputs, insightsReference2026.edits);
  const rows2024 = ledger(insightsReference2024.inputs, insightsReference2024.edits);

  it('October 2026 (current month) against September, by day 12', () => {
    expect(compareFor(rows2026, OCT, insightsReference2026.today)).toEqual(
      insightsReference2026.expected.categoriesOctober,
    );
  });

  it('September 2026 (past month) against August', () => {
    expect(compareFor(rows2026, SEP, insightsReference2026.today)).toEqual(
      insightsReference2026.expected.categoriesSeptember,
    );
  });

  it('March 2024 (day 30) against a 29-day February', () => {
    expect(compareFor(rows2024, { year: 2024, month: 3 }, insightsReference2024.today)).toEqual(
      insightsReference2024.expected.categoriesMarch,
    );
  });
});
