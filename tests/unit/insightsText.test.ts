import type { YearMonth } from '@/domain/month';
import type { DayDetail, Pace, PaceSentence } from '@/domain/pace';
import type { CategoryComparison } from '@/domain/categoryChanges';
import {
  categoriesSentence,
  categoryColumnTitles,
  categoryRowTexts,
  comparedByLabel,
  dayDetailLines,
  daySpokenValue,
  paceCardLabel,
  paceSentence,
} from '@/format/insights';

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

  it('"New" and "0%" changes; a zero difference has no sign', () => {
    const fresh: DayDetail = {
      day: 2,
      selectedCents: 5_875,
      previousCents: 0,
      change: { differenceCents: 5_875, percent: 'new' },
    };
    expect(dayDetailLines(fresh, pace(true), ES)[3]).toBe(`${eur('+58,75')} · New`);
    expect(daySpokenValue(fresh, pace(true), ES)).toBe(
      `October: ${eur('58,75')}, September: ${eur('0,00')}, plus ${eur('58,75')}, new`,
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

  it('column titles: this month, last month, change; month names for a past month; one when no data', () => {
    expect(categoryColumnTitles(currentChanges, OCT)).toEqual(['This month', 'Last month', 'Change']);
    expect(categoryColumnTitles(pastChanges, AUG)).toEqual(['August', 'July', 'Change']);
    expect(
      categoryColumnTitles({ kind: 'noPreviousData', previousMonth: SEP, isCurrent: true, rows: [] }, OCT),
    ).toEqual(['This month']);
    expect(
      categoryColumnTitles({ kind: 'noPreviousData', previousMonth: JUL, isCurrent: false, rows: [] }, AUG),
    ).toEqual(['August']);
    expect(categoryColumnTitles({ kind: 'noSpending' }, OCT)).toEqual([]);
  });

  it('current month rows: cells and the spoken label', () => {
    expect(categoryRowTexts(currentChanges, OCT, ES)).toEqual([
      {
        label: 'Food',
        current: eur('100,00'),
        previous: eur('90,00'),
        change: `+${eur('10,00')}`,
        percent: '+11%',
        accessibilityLabel: `Food, this month ${eur('100,00')}, last month ${eur('90,00')}, plus ${eur('10,00')}, plus 11 percent`,
      },
    ]);
  });

  it('past month rows: month names, New, and negatives spoken as minus', () => {
    const [food, leisure, transport] = categoryRowTexts(pastChanges, AUG, ES);
    expect(food.accessibilityLabel).toBe(
      `Food, August ${eur('260,00')}, July ${eur('200,00')}, plus ${eur('60,00')}, plus 30 percent`,
    );
    expect(leisure).toMatchObject({ change: `+${eur('40,00')}`, percent: 'New' });
    expect(leisure.accessibilityLabel).toBe(
      `Leisure, August ${eur('40,00')}, July ${eur('0,00')}, plus ${eur('40,00')}, new`,
    );
    expect(transport).toMatchObject({ change: `-${eur('30,00')}`, percent: '-38%' });
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
