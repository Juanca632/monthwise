import type { Percent } from '@/domain/percent';

// Texts and spoken forms exactly as contracts/ui-screens.md, Notation. A rounded 0 with a sign is
// a real change under 0.5 %, shown as "<1%" so it never reads as "no change" (FR-017).

/** Magnitude without sign: `30`, `<1`, `0`. */
const magnitude = (p: Percent): string =>
  p.rounded === 0 && p.sign !== 0 ? '<1' : String(Math.abs(p.rounded));

const spokenMagnitude = (p: Percent): string =>
  p.rounded === 0 && p.sign !== 0 ? 'less than 1' : String(Math.abs(p.rounded));

/** `+30%`, `-38%`, `+<1%`, `-<1%`, `0%`. A change from 0 has no percent; callers say so. */
export function formatChangePercent(p: Percent): string {
  const sign = p.sign > 0 ? '+' : p.sign < 0 ? '-' : '';
  return `${sign}${magnitude(p)}%`;
}

/** `15%`, `-8%`, `<1%`, `-<1%`, `0%`, `No income`: minus only. */
export function formatRate(p: Percent | null): string {
  if (p === null) return 'No income';
  return `${p.sign < 0 ? '-' : ''}${magnitude(p)}%`;
}

/** "plus 30 percent", "minus less than 1 percent", "0 percent". */
export function spokenChangePercent(p: Percent): string {
  const sign = p.sign > 0 ? 'plus ' : p.sign < 0 ? 'minus ' : '';
  return `${sign}${spokenMagnitude(p)} percent`;
}

/** "15 percent", "minus 8 percent", "less than 1 percent", "no income". */
export function spokenRate(p: Percent | null): string {
  if (p === null) return 'no income';
  return `${p.sign < 0 ? 'minus ' : ''}${spokenMagnitude(p)} percent`;
}
