import type { YearMonth } from '@/domain/month';
import type { DayDetail, Pace, PaceSentence } from '@/domain/pace';
import type { CategoryComparison } from '@/domain/categoryChanges';
import {
  categoriesSentence,
  categoryRowTexts,
  comparedByLabel,
  dayDetailLines,
  daySpokenValue,
  paceCardLabel,
  paceSentence,
  paceSentenceParts,
  shortMonthName,
  trendDetailLines,
  trendHeadline,
  trendHeadlineLabel,
  trendHeadlineParts,
  trendSpokenValue,
} from '@/format/insights';
import type { MonthTotals, Trend } from '@/domain/trend';

// Literal strings from contracts/ui-screens.md (es-ES). Spanish puts a no-break space before €.
const NBSP = '\u00A0';
const ES = 'es-ES';
const eur = (text: string) => `${text}${NBSP}€`;

const OCT: YearMonth = { year: 2026, month: 10 };
const SEP: YearMonth = { year: 2026, month: 9 };
const JUL: YearMonth = { year: 2026, month: 7 };

describe('paceSentence (FR-003)', () => {
  it.each<[PaceSentence, string]>([
    [{ kind: 'noSpending' }, 'No spending to compare yet'],
    [
      { kind: 'noPreviousData', previousMonth: SEP, isCurrent: true },
      'No data from last month to compare',
    ],
    [
      { kind: 'noPreviousData', previousMonth: JUL, isCurrent: false },
      'No data from July to compare',
    ],
    [
      { kind: 'more', differenceCents: 8_500, comparisonDay: 12, previousMonth: SEP },
      `${eur('85,00')} more than last month by day 12`,
    ],
    [
      { kind: 'less', differenceCents: 6_500, comparisonDay: 12, previousMonth: SEP },
      `${eur('65,00')} less than last month by day 12`,
    ],
    [
      { kind: 'same', differenceCents: 0, comparisonDay: 12, previousMonth: SEP },
      'Same as last month by day 12',
    ],
    [
      { kind: 'more', differenceCents: 20_000, comparisonDay: null, previousMonth: JUL },
      `${eur('200,00')} more than July`,
    ],
    [
      { kind: 'less', differenceCents: 20_000, comparisonDay: null, previousMonth: JUL },
      `${eur('200,00')} less than July`,
    ],
    [
      { kind: 'same', differenceCents: 0, comparisonDay: null, previousMonth: JUL },
      'Same as July',
    ],
    [
      { kind: 'more', differenceCents: 99_999_999_900, comparisonDay: 30, previousMonth: SEP },
      `${eur('999.999.999,00')} more than last month by day 30`,
    ],
  ])('%j → %s', (sentence, text) => {
    expect(paceSentence(sentence, ES)).toBe(text);
  });

  it('the card label prefixes "Spending pace"', () => {
    expect(
      paceCardLabel(
        { kind: 'more', differenceCents: 8_500, comparisonDay: 12, previousMonth: SEP },
        ES,
      ),
    ).toBe(`Spending pace, ${eur('85,00')} more than last month by day 12`);
  });
});

describe('day detail (FR-007)', () => {
  const pace = (previous: boolean): Pace => ({
    selected: { month: OCT, cumulativeCents: [] },
    previous: previous ? { month: SEP, cumulativeCents: [] } : null,
    chartDays: 31,
    comparisonDay: 12,
    sentence: { kind: 'noSpending' },
  });

  it('US1-AS9: both amounts and the change', () => {
    const detail: DayDetail = {
      day: 8,
      selectedCents: 12_000,
      previousCents: 10_000,
      change: { differenceCents: 2_000, percent: { rounded: 20, sign: 1 } },
    };
    expect(dayDetailLines(detail, pace(true), ES)).toEqual([
      'Day 8',
      `October: ${eur('120,00')}`,
      `September: ${eur('100,00')}`,
      `${eur('+20,00')} · +20%`,
    ]);
    expect(daySpokenValue(detail, pace(true), ES)).toBe(
      `October: ${eur('120,00')}, September: ${eur('100,00')}, plus ${eur('20,00')}, plus 20 percent`,
    );
  });

  it('negatives are spoken as "minus"', () => {
    const detail: DayDetail = {
      day: 14,
      selectedCents: 79_465,
      previousCents: 108_890,
      change: { differenceCents: -29_425, percent: { rounded: -27, sign: -1 } },
    };
    expect(dayDetailLines(detail, pace(true), ES)[3]).toBe(`${eur('-294,25')} · -27%`);
    expect(daySpokenValue(detail, pace(true), ES)).toBe(
      `October: ${eur('794,65')}, September: ${eur('1.088,90')}, minus ${eur('294,25')}, minus 27 percent`,
    );
  });

  it('US1-AS10: a day after the line shows only the previous month', () => {
    const detail: DayDetail = { day: 20, selectedCents: null, previousCents: 45_000, change: null };
    expect(dayDetailLines(detail, pace(true), ES)).toEqual(['Day 20', `September: ${eur('450,00')}`]);
    expect(daySpokenValue(detail, pace(true), ES)).toBe(`September: ${eur('450,00')}`);
  });

  it('no previous data: only the selected month', () => {
    const detail: DayDetail = { day: 3, selectedCents: 500, previousCents: null, change: null };
    expect(dayDetailLines(detail, pace(false), ES)).toEqual(['Day 3', `October: ${eur('5,00')}`]);
  });

  it('a change from 0 has no percent; "0%" when both are 0; a zero difference has no sign', () => {
    const fresh: DayDetail = {
      day: 2,
      selectedCents: 5_875,
      previousCents: 0,
      change: { differenceCents: 5_875, percent: 'new' },
    };
    expect(dayDetailLines(fresh, pace(true), ES)[3]).toBe(eur('+58,75'));
    expect(daySpokenValue(fresh, pace(true), ES)).toBe(
      `October: ${eur('58,75')}, September: ${eur('0,00')}, plus ${eur('58,75')}`,
    );

    const none: DayDetail = {
      day: 1,
      selectedCents: 0,
      previousCents: 0,
      change: { differenceCents: 0, percent: { rounded: 0, sign: 0 } },
    };
    expect(dayDetailLines(none, pace(true), ES)[3]).toBe(`${eur('0,00')} · 0%`);
    expect(daySpokenValue(none, pace(true), ES)).toBe(
      `October: ${eur('0,00')}, September: ${eur('0,00')}, ${eur('0,00')}, 0 percent`,
    );
  });
});

describe('categories texts (Section 2)', () => {
  const AUG: YearMonth = { year: 2026, month: 8 };
  const currentChanges: CategoryComparison = {
    kind: 'changes',
    comparisonDay: 12,
    rows: [
      { category: 'food', currentCents: 10_000, previousCents: 9_000, changeCents: 1_000, percent: { rounded: 11, sign: 1 } },
    ],
  };
  const pastChanges: CategoryComparison = {
    kind: 'changes',
    comparisonDay: null,
    rows: [
      { category: 'food', currentCents: 26_000, previousCents: 20_000, changeCents: 6_000, percent: { rounded: 30, sign: 1 } },
      { category: 'leisure', currentCents: 4_000, previousCents: 0, changeCents: 4_000, percent: 'new' },
      { category: 'transport', currentCents: 5_000, previousCents: 8_000, changeCents: -3_000, percent: { rounded: -38, sign: -1 } },
    ],
  };

  it('sentences: no spending, and no data from last month or from a named month', () => {
    expect(categoriesSentence({ kind: 'noSpending' })).toBe('No spending to compare yet');
    expect(categoriesSentence({ kind: 'noPreviousData', previousMonth: SEP, isCurrent: true, rows: [] })).toBe(
      'No data from last month to compare',
    );
    expect(categoriesSentence({ kind: 'noPreviousData', previousMonth: JUL, isCurrent: false, rows: [] })).toBe(
      'No data from July to compare',
    );
    expect(categoriesSentence(currentChanges)).toBeNull();
  });

  it('Compared by day N only for the current month with changes', () => {
    expect(comparedByLabel(currentChanges)).toBe('Compared by day 12');
    expect(comparedByLabel(pastChanges)).toBeNull();
    expect(comparedByLabel({ kind: 'noSpending' })).toBeNull();
    expect(comparedByLabel({ kind: 'noPreviousData', previousMonth: SEP, isCurrent: true, rows: [] })).toBeNull();
  });

  it('current month rows: amount, change line vs last month, and the spoken label', () => {
    expect(categoryRowTexts(currentChanges, OCT, ES)).toEqual([
      {
        label: 'Food',
        current: eur('100,00'),
        change: `+${eur('10,00')} vs last month`,
        percent: '+11%',
        accessibilityLabel: `Food, this month ${eur('100,00')}, last month ${eur('90,00')}, plus ${eur('10,00')}, plus 11 percent`,
      },
    ]);
  });

  it('past month rows: month names, nothing in July, and negatives spoken as minus', () => {
    const [food, leisure, transport] = categoryRowTexts(pastChanges, AUG, ES);
    expect(food.accessibilityLabel).toBe(
      `Food, August ${eur('260,00')}, July ${eur('200,00')}, plus ${eur('60,00')}, plus 30 percent`,
    );
    expect(leisure.change).toBe(`+${eur('40,00')} · nothing in July`);
    expect(leisure.percent).toBeUndefined();
    expect(leisure.accessibilityLabel).toBe(
      `Leisure, August ${eur('40,00')}, July ${eur('0,00')}, plus ${eur('40,00')}`,
    );
    expect(transport).toMatchObject({ change: `-${eur('30,00')} vs July`, percent: '-38%' });
    expect(transport.accessibilityLabel).toBe(
      `Transport, August ${eur('50,00')}, July ${eur('80,00')}, minus ${eur('30,00')}, minus 38 percent`,
    );
  });

  it('no data rows: only the label and this month\'s amount', () => {
    const current = categoryRowTexts(
      { kind: 'noPreviousData', previousMonth: SEP, isCurrent: true, rows: [{ category: 'food', amountCents: 26_000 }] },
      OCT,
      ES,
    );
    expect(current).toEqual([
      { label: 'Food', current: eur('260,00'), accessibilityLabel: `Food, this month ${eur('260,00')}` },
    ]);
    const past = categoryRowTexts(
      { kind: 'noPreviousData', previousMonth: JUL, isCurrent: false, rows: [{ category: 'food', amountCents: 26_000 }] },
      AUG,
      ES,
    );
    expect(past[0].accessibilityLabel).toBe(`Food, August ${eur('260,00')}`);
  });
});

it('categories, current month: nothing last month', () => {
  const [row] = categoryRowTexts(
    {
      kind: 'changes',
      comparisonDay: 12,
      rows: [{ category: 'leisure', currentCents: 4_000, previousCents: 0, changeCents: 4_000, percent: 'new' }],
    },
    OCT,
    ES,
  );
  expect(row.change).toBe(`+${eur('40,00')} · nothing last month`);
  expect(row.percent).toBeUndefined();
});

describe('trend texts (Section 3)', () => {
  const trend = (totalSavedCents: number, monthsWithData: number, rate: Trend['rate']): Trend => ({
    months: [],
    monthsWithData,
    totalSavedCents,
    rate,
  });
  const sep: MonthTotals = {
    month: SEP,
    hasData: true,
    incomeCents: 200_000,
    expenseCents: 170_000,
    savedCents: 30_000,
    rate: { rounded: 15, sign: 1 },
  };

  it('headline: N months, 1 month, a minus, No income', () => {
    expect(trendHeadline(trend(180_000, 6, { rounded: 15, sign: 1 }), ES)).toBe(`Saved ${eur('1.800,00')} in 6 months · 15%`);
    expect(trendHeadline(trend(-40_000, 1, null), ES)).toBe(`Saved -${eur('400,00')} in 1 month · No income`);
  });

  it('headline label: spoken, the dot read as a comma', () => {
    expect(trendHeadlineLabel(trend(180_000, 6, { rounded: 15, sign: 1 }), ES)).toBe(
      `Saved ${eur('1.800,00')} in 6 months, 15 percent`,
    );
    expect(trendHeadlineLabel(trend(-40_000, 1, null), ES)).toBe(`Saved minus ${eur('400,00')} in 1 month, no income`);
  });

  it('short month names', () => {
    expect(shortMonthName({ year: 2026, month: 5 })).toBe('May');
    expect(shortMonthName(SEP)).toBe('Sep');
  });

  it('month detail lines and spoken value', () => {
    expect(trendDetailLines(sep, ES)).toEqual([
      'September',
      `Income: ${eur('2.000,00')}`,
      `Expenses: ${eur('1.700,00')}`,
      `Saved: ${eur('300,00')}`,
      'Savings rate: 15%',
    ]);
    expect(trendSpokenValue(sep, ES)).toBe(
      `Income ${eur('2.000,00')}, expenses ${eur('1.700,00')}, saved ${eur('300,00')}, savings rate 15 percent`,
    );
  });

  it('a negative month and a month without income', () => {
    const aug: MonthTotals = { ...sep, month: { year: 2026, month: 8 }, expenseCents: 215_000, savedCents: -15_000, rate: { rounded: -8, sign: -1 } };
    expect(trendDetailLines(aug, ES).slice(3)).toEqual([`Saved: -${eur('150,00')}`, 'Savings rate: -8%']);
    expect(trendSpokenValue(aug, ES)).toContain(`saved minus ${eur('150,00')}, savings rate minus 8 percent`);
    const jul: MonthTotals = { ...sep, month: JUL, incomeCents: 0, expenseCents: 40_000, savedCents: -40_000, rate: null };
    expect(trendDetailLines(jul, ES)[4]).toBe('Savings rate: No income');
    expect(trendSpokenValue(jul, ES)).toContain('savings rate no income');
  });

  it('a month without data', () => {
    const jun: MonthTotals = { month: { year: 2026, month: 6 }, hasData: false, incomeCents: 0, expenseCents: 0, savedCents: 0, rate: null };
    expect(trendDetailLines(jun, ES)).toEqual(['June', 'No data']);
    expect(trendSpokenValue(jun, ES)).toBe('No data');
  });
});

describe('paceSentenceParts (fine-tuning 2026-10-09)', () => {
  it('splits the answer off a more or less sentence', () => {
    const parts = paceSentenceParts({ kind: 'more', differenceCents: 8_500, comparisonDay: 12, previousMonth: SEP }, ES);
    expect(parts).toEqual({ lead: `${eur('85,00')} more`, rest: ' than last month by day 12', tone: 'more' });
    const less = paceSentenceParts({ kind: 'less', differenceCents: 20_000, comparisonDay: null, previousMonth: JUL }, ES);
    expect(less).toEqual({ lead: `${eur('200,00')} less`, rest: ' than July', tone: 'less' });
  });

  it('keeps other sentences whole, with no tone', () => {
    expect(paceSentenceParts({ kind: 'same', differenceCents: 0, comparisonDay: 12, previousMonth: SEP }, ES)).toEqual({
      lead: '',
      rest: 'Same as last month by day 12',
      tone: null,
    });
    expect(paceSentenceParts({ kind: 'noSpending' }, ES).tone).toBeNull();
  });
});

it('trendHeadlineParts splits the answer off the headline', () => {
  const t = { months: [], monthsWithData: 6, totalSavedCents: -40_000, rate: null };
  expect(trendHeadlineParts(t, ES)).toEqual({ lead: `Saved -${eur('400,00')}`, rest: ' in 6 months · No income' });
});
