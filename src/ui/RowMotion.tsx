// The one row an edit changed flashes (design.md, Motion, "Saved"). A new or deleted row has no
// motion of its own: it just appears or goes, and the rows around it glide to their new places
// through the list's own layout transition (`rowShift` in TransactionList), which runs natively.
// Fading or sliding the row itself cost frames for little (developer's phone review, fine-tuning
// 2026-10-07). Every other row, including the 1,000 of a big month, never animates.
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Transaction } from '@/data/transactionRepository';
import type { LastChange } from '@/state/SummaryNoticeContext';

import { durations, easeOut, useReduceMotion } from './motion';
import { useTheme } from './theme';

/** The only row change with its own motion. */
export type RowChange = 'updated';

type Shown = {
  /** The reload result the last change was matched against. */
  rows: readonly Transaction[];
  /** The last change already matched, so it animates once. */
  matched: LastChange | null;
  /** The edited row to flash in this result. */
  flashing: number | null;
};

/**
 * Matches the last save or delete against each new reload result. An edited row flashes when a
 * result that reflects it arrives, and only once; if the reload fails, nothing animates.
 */
export function useRowChanges(
  rows: readonly Transaction[],
  status: 'loading' | 'error' | 'ready',
  lastChange: LastChange | null,
): { rows: readonly Transaction[]; changeFor(id: number): RowChange | null } {
  const [shown, setShown] = useState<Shown>({ rows, matched: lastChange, flashing: null });

  // A new result: work out what it means during this render (React's "adjusting state when a prop
  // changes"), so the flash starts with the frame that shows the new values.
  let current = shown;
  if (rows !== shown.rows) {
    current = { rows, matched: shown.matched, flashing: null };
    // While loading (a save that moved the summary to the row's month) the change waits for the
    // result; an error uses it up, so a later retry does not animate.
    if (lastChange && lastChange !== shown.matched && status !== 'loading') {
      current.matched = lastChange;
      const { kind, id } = lastChange;
      if (status === 'ready' && kind === 'updated' && rows.some((r) => r.id === id)) {
        current.flashing = id;
      }
    }
    setShown(current);
  }

  return {
    rows,
    changeFor: (id) => (current.flashing === id ? 'updated' : null),
  };
}

type RowMotionProps = {
  change: RowChange | null;
  /** The row's card shape (its margins and outer corners), so the flash stays inside it. */
  flashShape: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Rows without a change get no wrapper at all, so a long list pays nothing. */
export function RowMotion({ change, flashShape, children }: RowMotionProps) {
  if (!change) return children;
  return <FlashingRow flashShape={flashShape}>{children}</FlashingRow>;
}

function FlashingRow({ flashShape, children }: Omit<RowMotionProps, 'change'>) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const flash = useSharedValue(1);

  useEffect(() => {
    flash.set(
      withTiming(0, {
        duration: reduceMotion ? durations.reducedFade : durations.rowChange,
        easing: easeOut,
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [flash, reduceMotion]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View testID="row-updated">
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, flashShape, { backgroundColor: colors.rowFlash }, flashStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flash: { position: 'absolute', top: 0, bottom: 0 },
});
