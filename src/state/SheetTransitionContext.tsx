import { createContext, useContext, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * One value for the form sheet, 0 closed to 1 open (design.md, Motion, "Sheet"). The form's sheet
 * writes it; the summary behind reads it for its scale, offset, radius and scrim, so both move
 * together on the UI thread.
 */
const SheetTransitionContext = createContext<SharedValue<number> | null>(null);

export function SheetTransitionProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);
  return (
    <SheetTransitionContext.Provider value={progress}>{children}</SheetTransitionContext.Provider>
  );
}

/** Outside the provider (a screen rendered on its own, as in tests) the value is the screen's own. */
export function useSheetProgress(): SharedValue<number> {
  const own = useSharedValue(0);
  return useContext(SheetTransitionContext) ?? own;
}
