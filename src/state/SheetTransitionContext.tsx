import { createContext, useContext, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/** A screen a form's sheet can open over. */
export type SheetOpener = 'summary' | 'all';

type SheetTransition = {
  /** 0 closed to 1 open. */
  progress: SharedValue<number>;
  /** The screen that opened the sheet: only it moves back, never one hidden under it. */
  opener: SharedValue<SheetOpener>;
};

/**
 * One value for the form sheet (design.md, Motion, "Sheet"). The form's sheet writes `progress`;
 * the screen behind reads it for its scale, offset, radius and scrim, so both move together on
 * the UI thread. `opener` keeps the summary still while See all is open over it: animating both
 * full screens at once dropped frames (fine-tuning 2026-10-07).
 */
const SheetTransitionContext = createContext<SheetTransition | null>(null);

export function SheetTransitionProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);
  const opener = useSharedValue<SheetOpener>('summary');
  return (
    <SheetTransitionContext.Provider value={{ progress, opener }}>
      {children}
    </SheetTransitionContext.Provider>
  );
}

/** Outside the provider (a screen rendered on its own, as in tests) the values are the screen's own. */
function useSheetTransition(): SheetTransition {
  const progress = useSharedValue(0);
  const opener = useSharedValue<SheetOpener>('summary');
  return useContext(SheetTransitionContext) ?? { progress, opener };
}

export function useSheetProgress(): SharedValue<number> {
  return useSheetTransition().progress;
}

export function useSheetOpener(): SharedValue<SheetOpener> {
  return useSheetTransition().opener;
}
