import { labelFor } from '@/domain/categories';
import type { CategoryComparison } from '@/domain/categoryChanges';
import { previous as previousMonthOf, type YearMonth } from '@/domain/month';
import type { DayDetail, Pace, PaceSentence } from '@/domain/pace';
import { monthName } from '@/format/date';
import {
  formatMoney,
  formatSignedDifference,
  spokenMoney,
  spokenSignedDifference,
} from '@/format/money';
import { formatChangePercent, spokenChangePercent } from '@/format/percent';

// Insights texts exactly as contracts/ui-screens.md; amounts follow the region (`tag`), words
// stay English (FR-029).

/** FR-003: the card's and the pace section's sentence. */
export function paceSentence(sentence: PaceSentence, tag: string): string {
  switch (sentence.kind) {
    case 'noSpending':
      return 'No spending to compare yet';
    case 'noPreviousData':
      return sentence.isCurrent
        ? 'No data from last month to compare'
        : `No data from ${monthName(sentence.previousMonth)} to compare`;
    default: {
      const day = sentence.comparisonDay;
      const against = day === null ? monthName(sentence.previousMonth) : 'last month';
      const by = day === null ? '' : ` by day ${day}`;
      if (sentence.kind === 'same') return `Same as ${against}${by}`;
      const amount = formatMoney(sentence.differenceCents, tag);
      return `${amount} ${sentence.kind} than ${against}${by}`;
    }
  }
}

/** The whole card is one button with this label. */
export function paceCardLabel(sentence: PaceSentence, tag: string): string {
  return `Spending pace, ${paceSentence(sentence, tag)}`;
}

type DetailPart = { text: string; spoken: string };

/** FR-007's lines after "Day N", each with its spoken form. */
function detailParts(detail: DayDetail, pace: Pace, tag: string): DetailPart[] {
  const parts: DetailPart[] = [];
  if (detail.selectedCents !== null) {
    const name = monthName(pace.selected.month);
    parts.push({
      text: `${name}: ${formatMoney(detail.selectedCents, tag)}`,
      spoken: `${name}: ${spokenMoney(detail.selectedCents, tag)}`,
    });
  }
  if (detail.previousCents !== null && pace.previous !== null) {
    const name = monthName(pace.previous.month);
    parts.push({
      text: `${name}: ${formatMoney(detail.previousCents, tag)}`,
      spoken: `${name}: ${spokenMoney(detail.previousCents, tag)}`,
    });
  }
  if (detail.change !== null) {
    const { differenceCents, percent } = detail.change;
    const text = formatSignedDifference(differenceCents, tag);
    const spoken = spokenSignedDifference(differenceCents, tag);
    // From 0 there is no percent; the line above already shows the previous month's 0 (FR-007).
    parts.push(
      percent === 'new'
        ? { text, spoken }
        : { text: `${text} · ${formatChangePercent(percent)}`, spoken: `${spoken}, ${spokenChangePercent(percent)}` },
    );
  }
  return parts;
}

/** `Day 8`, `October: 120,00 €`, `September: 100,00 €`, `+20,00 € · +20%`. */
export function dayDetailLines(detail: DayDetail, pace: Pace, tag: string): string[] {
  return [`Day ${detail.day}`, ...detailParts(detail, pace, tag).map((p) => p.text)];
}

/** The screen reader's value for a day: `October: 120,00 €, September: 100,00 €, plus 20,00 €, plus 20 percent`. */
export function daySpokenValue(detail: DayDetail, pace: Pace, tag: string): string {
  return detailParts(detail, pace, tag)
    .map((p) => p.spoken)
    .join(', ');
}

// Categories vs last month (contracts/ui-screens.md, Section 2).

/** The sentence shown instead of the changes; `null` when the section shows changes. */
export function categoriesSentence(comparison: CategoryComparison): string | null {
  switch (comparison.kind) {
    case 'noSpending':
      return 'No spending to compare yet';
    case 'noPreviousData':
      return comparison.isCurrent
        ? 'No data from last month to compare'
        : `No data from ${monthName(comparison.previousMonth)} to compare`;
    case 'changes':
      return null;
  }
}

/** `Compared by day 12`, only when changes are shown for the current month. */
export function comparedByLabel(comparison: CategoryComparison): string | null {
  return comparison.kind === 'changes' && comparison.comparisonDay !== null
    ? `Compared by day ${comparison.comparisonDay}`
    : null;
}

/** How each amount is named: "this month" / "last month", or the months' names for a past month. */
function monthNames(selected: YearMonth, isCurrent: boolean): { current: string; previous: string } {
  return isCurrent
    ? { current: 'This month', previous: 'Last month' }
    : { current: monthName(selected), previous: monthName(previousMonthOf(selected)) };
}

const isCurrentComparison = (comparison: CategoryComparison): boolean =>
  comparison.kind === 'noPreviousData'
    ? comparison.isCurrent
    : comparison.kind === 'changes' && comparison.comparisonDay !== null;

export type CategoryRowText = {
  label: string;
  current: string;
  /** `+60,00 € vs last month`, or `+40,00 € · nothing in July`; absent in the "no data" case. */
  change?: string;
  /** Absent in the "no data" case and when last month was 0. */
  percent?: string;
  /** The row is one accessible element with this label. */
  accessibilityLabel: string;
};

/** One row's texts and its spoken label, e.g. `Food, this month 100,00 €, last month 90,00 €, plus 10,00 €, plus 11 percent`. */
export function categoryRowTexts(
  comparison: CategoryComparison,
  selected: YearMonth,
  tag: string,
): CategoryRowText[] {
  if (comparison.kind === 'noSpending') return [];
  const names = monthNames(selected, isCurrentComparison(comparison));
  // Spoken names are lower case for "this month", as a phrase; month names keep their capital.
  const spokenName = (name: string) => (name === 'This month' || name === 'Last month' ? name.toLowerCase() : name);

  if (comparison.kind === 'noPreviousData') {
    return comparison.rows.map(({ category, amountCents }) => {
      const label = labelFor('expense', category);
      return {
        label,
        current: formatMoney(amountCents, tag),
        accessibilityLabel: `${label}, ${spokenName(names.current)} ${spokenMoney(amountCents, tag)}`,
      };
    });
  }

  const against = isCurrentComparison(comparison) ? 'last month' : monthName(previousMonthOf(selected));
  return comparison.rows.map((row) => {
    const label = labelFor('expense', row.category);
    return {
      label,
      current: formatMoney(row.currentCents, tag),
      // Last month's amount is only spoken (FR-008): the list stays one number per line. From 0
      // there is no percent, so the line says why instead.
      change:
        row.percent === 'new'
          ? `${formatSignedDifference(row.changeCents, tag)} · nothing ${against === 'last month' ? 'last month' : `in ${against}`}`
          : `${formatSignedDifference(row.changeCents, tag)} vs ${against}`,
      percent: row.percent === 'new' ? undefined : formatChangePercent(row.percent),
      accessibilityLabel: [
        label,
        `${spokenName(names.current)} ${spokenMoney(row.currentCents, tag)}`,
        `${spokenName(names.previous)} ${spokenMoney(row.previousCents, tag)}`,
        spokenSignedDifference(row.changeCents, tag),
        ...(row.percent === 'new' ? [] : [spokenChangePercent(row.percent)]),
      ].join(', '),
    };
  });
}
