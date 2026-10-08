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

// Day headers use English weekday and month names too (FR-017, FR-029).
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
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
  return `${monthName(ym)} ${ym.year}`;
}

/** The month alone, e.g. "September" (002 legends, sentences and details). */
export function monthName(ym: YearMonth): string {
  return MONTH_NAMES[ym.month - 1];
}

/** Days between two calendar dates, counted in UTC so time zones and DST never shift them. */
function daysBetween(from: IsoDate, to: IsoDate): number {
  const utc = (iso: IsoDate) => {
    const { year, month, day } = parts(iso);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

function weekday(iso: IsoDate): string {
  const { year, month, day } = parts(iso);
  return WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** "Today" and "Yesterday" relative to the actual date, whatever month is on screen. */
function relativeDay(iso: IsoDate, today: IsoDate): string | null {
  const ago = daysBetween(iso, today);
  return ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : null;
}

/** A list day header: "Today", "Yesterday" or "Mon 5 Oct" (no year: a month never crosses one). */
export function dayName(iso: IsoDate, today: IsoDate): string {
  const { month, day } = parts(iso);
  return relativeDay(iso, today) ?? `${weekday(iso).slice(0, 3)} ${day} ${MONTH_NAMES[month - 1].slice(0, 3)}`;
}

/** The same day for screen readers: "Today", "Yesterday" or "Monday 5 October". */
export function spokenDayName(iso: IsoDate, today: IsoDate): string {
  const { month, day } = parts(iso);
  return relativeDay(iso, today) ?? `${weekday(iso)} ${day} ${MONTH_NAMES[month - 1]}`;
}
