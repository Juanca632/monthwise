// Curves and durations from design.md (Motion). Block 8b only needs the tone crossfade; the rest
// of the table arrives with the summary motion (T062).
import { Easing, useReducedMotion } from 'react-native-reanimated';

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);

export const durations = {
  toneChange: 600,
} as const;

/** Android's "Remove animations": every change becomes an instant swap (design.md, Reduce motion). */
export function useReduceMotion(): boolean {
  return useReducedMotion();
}
