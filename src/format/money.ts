import type { TransactionType } from '@/domain/categories';

// Money stays in integer cents up to here. `Intl` only ever sees whole euros, and the cents are
// spliced into the `fraction` part, so no float holds money (research R7, "Money without floats").

type SignDisplay = 'auto' | 'always';

// 'always' because Node's CLDR data skips grouping for 4-digit Spanish amounts (`1234,00 €`)
// while Android's ICU groups them (`1.234,00 €`). Hermes treats the option as truthy, so the
// phone output is unchanged and tests match it (device-checks.md).
const GROUPING = 'always';

const formatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(tag: string, signDisplay: SignDisplay): Intl.NumberFormat {
  const key = `${tag}|${signDisplay}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: 'EUR',
      numberingSystem: 'latn',
      useGrouping: GROUPING,
      signDisplay,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

function splitCents(cents: number): { euros: number; rest: number } {
  const abs = Math.abs(cents);
  const rest = abs % 100;
  return { euros: (abs - rest) / 100, rest };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

function currencyParts(
  cents: number,
  tag: string,
  signDisplay: SignDisplay,
): Intl.NumberFormatPart[] {
  const { euros, rest } = splitCents(cents);
  const sign = cents < 0 ? -1 : 1;
  // How engines sign a zero varies (`-0`, `+0`), so whole-euro zero borrows the layout of ±1
  // and puts the 0 back. This keeps `-0,50 €` signed.
  const parts = currencyFormatter(tag, signDisplay).formatToParts(sign * Math.max(euros, 1));
  return withEuroSign(
    parts.map((part) => {
      if (part.type === 'fraction') return { ...part, value: pad2(rest) };
      if (euros === 0 && part.type === 'integer') return { ...part, value: '0' };
      return part;
    }),
  );
}

/**
 * Always `€`, never the code `EUR` that regions outside the euro area get (`es-US`:
 * `EUR 1,234.00`; FR-029, research R7). Before the number, the space after a letter code goes
 * too, as ICU does for symbols: `€1,234.00`. After the number the region's spacing stays
 * (`1.234,00 €`).
 */
function withEuroSign(parts: Intl.NumberFormatPart[]): Intl.NumberFormatPart[] {
  const index = parts.findIndex((p) => p.type === 'currency');
  if (index < 0 || parts[index].value === '€') return parts;
  const integer = parts.findIndex((p) => p.type === 'integer');
  const next = parts[index + 1];
  const dropSpace = index < integer && next?.type === 'literal' && next.value.trim() === '';
  return parts
    .map((p, i) => (i === index ? { ...p, value: '€' } : p))
    .filter((_, i) => !(dropSpace && i === index + 1));
}

const join = (parts: Intl.NumberFormatPart[]): string => parts.map((p) => p.value).join('');

export function formatMoney(cents: number, tag: string): string {
  return join(currencyParts(cents, tag, 'auto'));
}

/** List amounts: `+` for income, minus for expense, with the sign glyphs `Intl` gives. */
export function formatSignedMoney(cents: number, type: TransactionType, tag: string): string {
  const abs = Math.abs(cents);
  return join(currencyParts(type === 'income' ? abs : -abs, tag, 'always'));
}

/** Differences (pace, category changes): `+` above 0, minus below, no sign at 0 (`0,00 €`). */
export function formatSignedDifference(cents: number, tag: string): string {
  return join(currencyParts(cents, tag, cents === 0 ? 'auto' : 'always'));
}

/** The form accepts `,` or `.`; any other decimal sign (e.g. Arabic `٫`) maps to `.`. */
export function formSeparator(tag: string): ',' | '.' {
  const decimal = new Intl.NumberFormat(tag, { numberingSystem: 'latn' })
    .formatToParts(1.5)
    .find((p) => p.type === 'decimal');
  return decimal?.value === ',' ? ',' : '.';
}

/** Text the amount field opens with when editing: no grouping and no €, so it parses back. */
export function formatAmountForInput(cents: number, tag: string): string {
  const { euros, rest } = splitCents(cents);
  return `${euros}${formSeparator(tag)}${pad2(rest)}`;
}

/** Screen readers can skip a lone `-`, so negatives are read with the word "minus" (FR-031). */
export function spokenMoney(cents: number, tag: string): string {
  const amount = formatMoney(Math.abs(cents), tag);
  return cents < 0 ? `minus ${amount}` : amount;
}

/** Spoken form of `formatSignedDifference`: "plus 60,00 €", "minus 30,00 €", "0,00 €". */
export function spokenSignedDifference(cents: number, tag: string): string {
  const amount = formatMoney(Math.abs(cents), tag);
  if (cents > 0) return `plus ${amount}`;
  return cents < 0 ? `minus ${amount}` : amount;
}

/** Where the form's `€` goes, following the region's currency layout (design.md). */
export function currencyPosition(tag: string): 'before' | 'after' {
  const parts = currencyFormatter(tag, 'auto').formatToParts(1);
  const currency = parts.findIndex((p) => p.type === 'currency');
  const integer = parts.findIndex((p) => p.type === 'integer');
  return currency < integer ? 'before' : 'after';
}
