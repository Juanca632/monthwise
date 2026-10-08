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
    parts.push({
      text: `${formatSignedDifference(differenceCents, tag)} · ${formatChangePercent(percent)}`,
      spoken: `${spokenSignedDifference(differenceCents, tag)}, ${spokenChangePercent(percent)}`,
    });
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
