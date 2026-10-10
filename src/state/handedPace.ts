import type { YearMonth } from '@/domain/month';
import type { Pace } from '@/domain/pace';

// The pace the summary card already computed, handed to Insights so its pace section mounts drawn
// instead of loading during the push animation (like `openedTransaction.ts`). `pressedAt` lets
// the timing check (T054) measure from the card press.
let handed: { pace: Pace; pressedAt: number } | null = null;

/** Called by the card right before it opens Insights. */
export function handOffPace(pace: Pace, pressedAt: number): void {
  handed = { pace, pressedAt };
}

/** The handed pace only for the month it was computed for; another month loads its own. */
export function takePace(month: YearMonth): { pace: Pace; pressedAt: number } | null {
  if (!handed) return null;
  const m = handed.pace.selected.month;
  return m.year === month.year && m.month === month.month ? handed : null;
}

/**
 * Called on a month change on Insights, so an old pace is never reused. Not on close: the card is
 * the only way into Insights and hands a fresh pace each time.
 */
export function dropPace(): void {
  handed = null;
}
