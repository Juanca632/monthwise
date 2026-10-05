/** Calendar month, `month` is 1..12. */
export type YearMonth = { year: number; month: number };

/** A calendar day as `YYYY-MM-DD`, not an instant. */
export type IsoDate = string;

export const MIN_MONTH: YearMonth = { year: 2000, month: 1 };

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

const fmt = (ym: YearMonth, day: number): IsoDate =>
  `${pad(ym.year, 4)}-${pad(ym.month)}-${pad(day)}`;

export function monthOf(iso: IsoDate): YearMonth {
  const [year, month] = iso.split('-').map(Number);
  return { year, month };
}

export function previous(ym: YearMonth): YearMonth {
  return ym.month === 1
    ? { year: ym.year - 1, month: 12 }
    : { year: ym.year, month: ym.month - 1 };
}

export function next(ym: YearMonth): YearMonth {
  return ym.month === 12
    ? { year: ym.year + 1, month: 1 }
    : { year: ym.year, month: ym.month + 1 };
}

/** Half-open range: queries use `date >= start AND date < endExclusive`. */
export function monthRange(ym: YearMonth): [start: IsoDate, endExclusive: IsoDate] {
  return [fmt(ym, 1), fmt(next(ym), 1)];
}

export function lastDayOf(ym: YearMonth): IsoDate {
  const { year, month } = ym;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return fmt(ym, days);
}

export function isMinMonth(ym: YearMonth): boolean {
  return ym.year === MIN_MONTH.year && ym.month === MIN_MONTH.month;
}

export function isCurrentMonth(ym: YearMonth, today: IsoDate): boolean {
  const t = monthOf(today);
  return t.year === ym.year && t.month === ym.month;
}

/** FR-003: pre-fill today in the current month, otherwise the month's last day. */
export function defaultFormDate(selected: YearMonth, today: IsoDate): IsoDate {
  return isCurrentMonth(selected, today) ? today : lastDayOf(selected);
}

/** Local getters on purpose: we want the user's calendar day, not the UTC one. */
export function toIsoDate(d: Date): IsoDate {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
