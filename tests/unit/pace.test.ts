import type { LedgerRow } from '@/domain/ledger';
import { rowsInMonth } from '@/domain/ledger';
import type { IsoDate, YearMonth } from '@/domain/month';
import { computePace, dayDetail, type Pace } from '@/domain/pace';
import {
  insightsReference2024,
  insightsReference2026,
  type InsightsEdit,
  type PaceExpectation,
} from '../fixtures/insightsReference';

const OCT: YearMonth = { year: 2026, month: 10 };
const SEP: YearMonth = { year: 2026, month: 9 };
const AUG: YearMonth = { year: 2026, month: 8 };
const JUL: YearMonth = { year: 2026, month: 7 };
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

describe('computePace: FR-003 sentences', () => {
  it('US1-AS1: more than last month by day 12', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-02', 20_000), expense('2026-10-12', 10_000)],
      [expense('2026-09-01', 15_000), expense('2026-09-12', 6_500), expense('2026-09-13', 9_900)],
      TODAY,
    );
    expect(pace.sentence).toEqual({
      kind: 'more',
      differenceCents: 8_500,
      comparisonDay: 12,
      previousMonth: SEP,
    });
    expect(pace.comparisonDay).toBe(12);
  });

  it('US1-AS2: less than last month by day 12', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-05', 15_000)],
      [expense('2026-09-01', 15_000), expense('2026-09-12', 6_500)],
      TODAY,
    );
    expect(pace.sentence).toEqual({
      kind: 'less',
      differenceCents: 6_500,
      comparisonDay: 12,
      previousMonth: SEP,
    });
  });

  it('US1-AS3: same as last month by day 12', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-03', 4_000), expense('2026-10-12', 1_000)],
      [expense('2026-09-10', 5_000), expense('2026-09-20', 7_000)],
      TODAY,
    );
    expect(pace.sentence).toEqual({
      kind: 'same',
      differenceCents: 0,
      comparisonDay: 12,
      previousMonth: SEP,
    });
  });

  it('US1-AS4: a past month compares whole months, both lines cover their month', () => {
    const pace = computePace(
      AUG,
      [expense('2026-08-01', 70_000), expense('2026-08-31', 50_000)],
      [expense('2026-07-15', 60_000), expense('2026-07-31', 40_000)],
      TODAY,
    );
    expect(pace.sentence).toEqual({
      kind: 'more',
      differenceCents: 20_000,
      comparisonDay: null,
      previousMonth: JUL,
    });
    expect(pace.comparisonDay).toBeNull();
    expect(pace.selected.cumulativeCents).toHaveLength(31);
    expect(pace.selected.cumulativeCents[30]).toBe(120_000);
    expect(pace.previous?.cumulativeCents).toHaveLength(31);
    expect(pace.previous?.cumulativeCents[30]).toBe(100_000);
  });

  it('US1-AS5: the current line ends at today, the previous one covers its whole month', () => {
    const pace = computePace(OCT, [expense('2026-10-03', 500)], [expense('2026-09-03', 700)], TODAY);
    expect(pace.selected.cumulativeCents).toHaveLength(12);
    expect(pace.previous?.cumulativeCents).toHaveLength(30);
    expect(pace.chartDays).toBe(31);
  });

  it('US1-AS6: no data in the previous month, current and past month', () => {
    const current = computePace(OCT, [expense('2026-10-03', 500)], [], TODAY);
    expect(current.previous).toBeNull();
    expect(current.sentence).toEqual({ kind: 'noPreviousData', previousMonth: SEP, isCurrent: true });

    const past = computePace(AUG, [expense('2026-08-03', 500)], [], TODAY);
    expect(past.sentence).toEqual({ kind: 'noPreviousData', previousMonth: JUL, isCurrent: false });
  });

  it('US1-AS7: no expenses in either month, with or without previous data', () => {
    expect(computePace(OCT, [], [], TODAY).sentence).toEqual({ kind: 'noSpending' });
    expect(computePace(OCT, [income('2026-10-01', 1_000)], [], TODAY).sentence).toEqual({
      kind: 'noSpending',
    });
    // Income only in the previous month: it has data, but no spending.
    expect(computePace(OCT, [], [income('2026-09-01', 1_000)], TODAY).sentence).toEqual({
      kind: 'noSpending',
    });
  });

  it('US1-AS7: counted by the comparison day (September spending all after the 12th)', () => {
    const pace = computePace(
      OCT,
      [],
      [expense('2026-09-13', 4_000), expense('2026-09-29', 1_000)],
      TODAY,
    );
    expect(pace.sentence).toEqual({ kind: 'noSpending' });
    expect(pace.previous).not.toBeNull();
  });

  it('a month with only income in the previous month still draws a flat line', () => {
    const pace = computePace(OCT, [expense('2026-10-01', 100)], [income('2026-09-05', 900)], TODAY);
    expect(pace.previous?.cumulativeCents).toEqual(new Array(30).fill(0));
    expect(pace.sentence).toEqual({
      kind: 'more',
      differenceCents: 100,
      comparisonDay: 12,
      previousMonth: SEP,
    });
  });
});

describe('dayDetail: FR-007', () => {
  it('US1-AS9: day 8 shows both amounts and the change', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-02', 7_000), expense('2026-10-08', 5_000), expense('2026-10-09', 900)],
      [expense('2026-09-04', 10_000), expense('2026-09-09', 300)],
      TODAY,
    );
    expect(dayDetail(pace, 8)).toEqual({
      day: 8,
      selectedCents: 12_000,
      previousCents: 10_000,
      change: { differenceCents: 2_000, percent: { rounded: 20, sign: 1 } },
    });
  });

  it('a day before day 1 has no selected amount and no change', () => {
    const pace = computePace(OCT, [expense('2026-10-02', 7_000)], [], TODAY);
    expect(dayDetail(pace, 0).selectedCents).toBeNull();
    expect(dayDetail(pace, 0).change).toBeNull();
  });

  it('US1-AS10: a day after today shows only the previous month', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-02', 7_000)],
      [expense('2026-09-04', 40_000), expense('2026-09-20', 5_000), expense('2026-09-21', 100)],
      TODAY,
    );
    expect(dayDetail(pace, 20)).toEqual({
      day: 20,
      selectedCents: null,
      previousCents: 45_000,
      change: null,
    });
  });

  it('previous month without data: no previous amount, no change', () => {
    const pace = computePace(OCT, [expense('2026-10-02', 7_000)], [], TODAY);
    expect(dayDetail(pace, 5)).toEqual({
      day: 5,
      selectedCents: 7_000,
      previousCents: null,
      change: null,
    });
  });

  it('"new" when the previous amount is 0 and the selected one is above 0; 0% when both are 0', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-05', 1_000)],
      [expense('2026-09-10', 2_000)],
      TODAY,
    );
    expect(dayDetail(pace, 3).change).toEqual({ differenceCents: 0, percent: { rounded: 0, sign: 0 } });
    expect(dayDetail(pace, 6).change).toEqual({ differenceCents: 1_000, percent: 'new' });
    expect(dayDetail(pace, 11).change).toEqual({
      differenceCents: -1_000,
      percent: { rounded: -50, sign: -1 },
    });
  });
});

describe('computePace: spec Edge Cases', () => {
  it('30 March against a 29-day February: February compared through its last day', () => {
    const MAR: YearMonth = { year: 2024, month: 3 };
    const pace = computePace(
      MAR,
      [expense('2024-03-30', 10_000)],
      [expense('2024-02-29', 8_000)],
      '2024-03-30',
    );
    expect(pace.sentence).toEqual({
      kind: 'more',
      differenceCents: 2_000,
      comparisonDay: 30,
      previousMonth: { year: 2024, month: 2 },
    });
    expect(dayDetail(pace, 31)).toEqual({
      day: 31,
      selectedCents: null,
      previousCents: 8_000,
      change: null,
    });
  });

  it('a later-dated expense extends the line and stays out of the sentence', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-05', 1_000), expense('2026-10-15', 3_000)],
      [expense('2026-09-05', 1_000), expense('2026-09-16', 13_000)],
      TODAY,
    );
    expect(pace.selected.cumulativeCents).toHaveLength(15);
    expect(pace.sentence).toEqual({
      kind: 'same',
      differenceCents: 0,
      comparisonDay: 12,
      previousMonth: SEP,
    });
    expect(dayDetail(pace, 14).selectedCents).toBe(1_000);
    expect(dayDetail(pace, 15).selectedCents).toBe(4_000);
    expect(dayDetail(pace, 16)).toEqual({
      day: 16,
      selectedCents: null,
      previousCents: 14_000,
      change: null,
    });
  });

  it('a later-dated income only runs the line on flat to its date', () => {
    const pace = computePace(
      OCT,
      [expense('2026-10-05', 1_000), income('2026-10-20', 50_000)],
      [],
      TODAY,
    );
    expect(pace.selected.cumulativeCents).toHaveLength(20);
    expect(pace.selected.cumulativeCents[19]).toBe(1_000);
  });

  it('a past month uses its whole month whatever the dates', () => {
    const pace = computePace(AUG, [expense('2026-08-31', 2_500)], [expense('2026-07-31', 500)], TODAY);
    expect(pace.selected.cumulativeCents).toHaveLength(31);
    expect(pace.sentence).toMatchObject({ kind: 'more', differenceCents: 2_000 });
  });

  it('January 2000: no previous data', () => {
    const JAN_2000: YearMonth = { year: 2000, month: 1 };
    const pace = computePace(JAN_2000, [expense('2000-01-10', 300)], [], TODAY);
    expect(pace.sentence).toEqual({
      kind: 'noPreviousData',
      previousMonth: { year: 1999, month: 12 },
      isCurrent: false,
    });
  });

  it('a past 30-day month against a 31-day one: day 31 has only the previous amount', () => {
    const pace = computePace(SEP, [expense('2026-09-30', 900)], [expense('2026-08-31', 400)], TODAY);
    expect(pace.selected.cumulativeCents).toHaveLength(30);
    expect(dayDetail(pace, 31)).toEqual({ day: 31, selectedCents: null, previousCents: 400, change: null });
    // August's only expense is on the 31st, so by day 30 it had spent nothing.
    expect(dayDetail(pace, 30).change).toEqual({ differenceCents: 900, percent: 'new' });
  });

  it('a new today the next day moves the comparison day', () => {
    const selected = [expense('2026-10-13', 600)];
    const previous = [expense('2026-09-13', 1_000)];
    expect(computePace(OCT, selected, previous, '2026-10-12').sentence).toEqual({
      kind: 'noSpending',
    });
    expect(computePace(OCT, selected, previous, '2026-10-13').sentence).toEqual({
      kind: 'less',
      differenceCents: 400,
      comparisonDay: 13,
      previousMonth: SEP,
    });
  });
});

describe('computePace: SC-001 reference set (T008 literals)', () => {
  type Input = (typeof insightsReference2026.inputs)[number];
  const ledger = (inputs: readonly Input[], edits: readonly InsightsEdit[]): LedgerRow[] => {
    const edited = [...inputs];
    for (const { index, input } of edits) edited[index] = input;
    return edited.map(({ type, amountCents, date, category }) => ({ type, amountCents, date, category }));
  };

  const check = (pace: Pace, expected: PaceExpectation) => {
    const { details, ...shape } = expected;
    expect(pace).toEqual(shape);
    for (const detail of details) expect(dayDetail(pace, detail.day)).toEqual(detail);
  };

  const prev = (ym: YearMonth): YearMonth =>
    ym.month === 1 ? { year: ym.year - 1, month: 12 } : { year: ym.year, month: ym.month - 1 };

  const paceFor = (rows: LedgerRow[], ym: YearMonth, today: IsoDate) =>
    computePace(ym, rowsInMonth(rows, ym), rowsInMonth(rows, prev(ym)), today);

  const rows2026 = ledger(insightsReference2026.inputs, insightsReference2026.edits);
  const rows2024 = ledger(insightsReference2024.inputs, insightsReference2024.edits);

  it('October 2026 (current month) against September', () => {
    check(paceFor(rows2026, OCT, insightsReference2026.today), insightsReference2026.expected.paceOctober);
  });

  it('September 2026 (past month) against August', () => {
    check(paceFor(rows2026, SEP, insightsReference2026.today), insightsReference2026.expected.paceSeptember);
  });

  it('March 2024 (day 30, later-dated income) against a 29-day February', () => {
    check(
      paceFor(rows2024, { year: 2024, month: 3 }, insightsReference2024.today),
      insightsReference2024.expected.paceMarch,
    );
  });
});
