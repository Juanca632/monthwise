import type { YearMonth } from '@/domain/month';
import type { DayDetail, Pace, PaceSentence } from '@/domain/pace';
import { dayDetailLines, daySpokenValue, paceCardLabel, paceSentence } from '@/format/insights';

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
