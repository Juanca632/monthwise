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
 * amounts"). `null` means "nothing to show": it returns `null` but remembers the last value, so
 * the next month counts from the previous one. The result only drives what is drawn; labels for
 * the screen reader are built from `target`.
 */
export function useCountUp(target: number | null, { animate, duration, easing }: Options): number | null {
  const [shown, setShown] = useState(target);
  const last = useRef(target);

  useEffect(() => {
    if (target === null) return;
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

  // Without animation the target shows on the same render, not one frame later.
  if (target === null) return null;
  return animate ? shown : target;
}
