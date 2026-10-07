import { useEffect, useRef, useState } from 'react';

type Options = {
  /** False under reduce motion: the value jumps to the target. */
  animate: boolean;
  duration: number;
  /** Maps progress 0..1 to eased progress 0..1. */
  easing(t: number): number;
};

/** How often the counted value reaches React state; the screen does not need every frame. */
const TICK_MS = 50;

/**
 * Counts from the last value shown to `target`, in whole cents (design.md, Motion, "Counting
 * amounts"). `null` means "nothing to show" (a month loading): it also forgets the last value,
 * so a month change shows the new amounts at once and only a change within the month on screen
 * counts. The result only drives what is drawn; labels for the screen reader are built from
 * `target`.
 */
export function useCountUp(target: number | null, { animate, duration, easing }: Options): number | null {
  const [shown, setShown] = useState(target);
  const last = useRef(target);

  useEffect(() => {
    if (target === null) {
      last.current = null;
      return;
    }
    const from = last.current;
    const show = (cents: number) => {
      last.current = cents;
      setShown(cents);
    };
    if (from === null || from === target || !animate) {
      show(target);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // Rounded at every step: amounts are integer cents, never floats.
      show(t === 1 ? target : Math.round(from + (target - from) * easing(t)));
      if (t === 1) clearInterval(timer);
    }, TICK_MS);
    // A new target mid-count starts from the value on screen.
    return () => clearInterval(timer);
  }, [target, animate, duration, easing]);

  // Nothing to show: forget what was shown, during this render (React's "adjusting state when a
  // prop changes"), so the next value starts fresh.
  if (target === null && shown !== null) setShown(null);

  // Without animation, or with nothing shown before, the target shows on the same render, not one
  // frame later.
  if (target === null) return null;
  return animate && shown !== null ? shown : target;
}
