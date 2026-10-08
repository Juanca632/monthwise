/** A whole percent plus the exact sign, so a non-zero value under 0.5 % shows as "<1%". */
export type Percent = { rounded: number; sign: -1 | 0 | 1 };

/**
 * Whole percent of `part / whole`, rounded half away from zero, in integers only (research R4):
 * `|p| = floor((200·|part| + whole) / (2·whole))`, then the sign of `part`. Half up would give
 * -37 for -37.5, and a float ratio can land on the wrong side of .5. The largest numerator
 * (FR-022's six-month bound) is about 1.2e14, so plain numbers stay exact. `whole` must be > 0;
 * callers handle 0 before ("New", "No income").
 */
export function percentOf(partCents: number, wholeCents: number): Percent {
  const numerator = 200 * Math.abs(partCents) + wholeCents;
  const denominator = 2 * wholeCents;
  // Integer floor without a float division: `%` is exact below 2^53.
  const magnitude = (numerator - (numerator % denominator)) / denominator;
  const sign = partCents > 0 ? 1 : partCents < 0 ? -1 : 0;
  // `0 * -1` is -0; the `|| 0` keeps `rounded` a plain 0.
  return { rounded: magnitude * sign || 0, sign };
}
