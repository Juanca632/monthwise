import type { IsoDate, YearMonth } from '@/domain/month';

// Month names are interface text, so they stay English whatever the region (FR-029).
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function parts(iso: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Region-style numeric date, e.g. `30/09/2026` (es-ES) or `09/30/2026` (en-US). */
export function formatNumericDate(iso: IsoDate, tag: string): string {
  let formatter = formatters.get(tag);
  if (!formatter) {
    // UTC on both sides: a calendar day must not shift with the phone's time zone.
    formatter = new Intl.DateTimeFormat(tag, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      numberingSystem: 'latn',
      timeZone: 'UTC',
    });
    formatters.set(tag, formatter);
  }
  const { year, month, day } = parts(iso);
  return formatter.format(Date.UTC(year, month - 1, day));
}

/** For screen readers, e.g. "30 September 2026". */
export function formatSpokenDate(iso: IsoDate): string {
  const { year, month, day } = parts(iso);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** Month header, e.g. "October 2026". */
export function monthTitle(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}
