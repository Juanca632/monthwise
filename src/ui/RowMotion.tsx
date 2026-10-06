// The one row a save or delete changed (design.md, Motion, "Saved" and "Deleted"): a new row
// grows in, an edited row flashes, a deleted row slides out and collapses. Every other row,
// including the 1,000 of a big month, never animates.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Transaction } from '@/data/transactionRepository';
import type { LastChange } from '@/state/SummaryNoticeContext';

import { createdRowScale, distances, durations, easeIn, easeOut, useReduceMotion } from './motion';
import { useTheme } from './theme';

export type RowChange = LastChange['kind'];

const never = { reduceMotion: ReduceMotion.Never };

/** How long a deleted row stays on screen for its exit. */
export function exitDuration(reduceMotion: boolean): number {
  return reduceMotion ? durations.reducedFade : durations.deleted;
}

type Shown = {
  /** The reload result the last change was matched against. */
  rows: readonly Transaction[];
  /** The last change already matched, so it animates once. */
  matched: LastChange | null;
  /** The created or updated row to animate in this result. */
  active: { kind: 'created' | 'updated'; id: number } | null;
  /** A deleted row kept for its exit, at its old place. */
  exiting: { row: Transaction; index: number } | null;
};

/**
 * Matches the last save or delete against each new reload result. A change only animates when a
 * result that reflects it arrives (so an edited row flashes with its new values, after the sheet
 * has closed), and only once. If the reload fails, nothing animates.
 */
export function useRowChanges(
  rows: readonly Transaction[],
  ready: boolean,
  lastChange: LastChange | null,
): { rows: readonly Transaction[]; changeFor(id: number): RowChange | null } {
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState<Shown>({ rows, matched: lastChange, active: null, exiting: null });

  // A new result: work out what it means during this render, so a deleted row never disappears
  // for a frame before its exit (React's "adjusting state when a prop changes").
  let current = shown;
  if (rows !== shown.rows) {
    current = { rows, matched: shown.matched, active: null, exiting: shown.exiting };
    if (lastChange && lastChange !== shown.matched) {
      current.matched = lastChange;
      if (ready) {
        const { kind, id } = lastChange;
        if (kind === 'deleted') {
          const index = shown.rows.findIndex((r) => r.id === id);
          if (index >= 0 && !rows.some((r) => r.id === id)) {
            current.exiting = { row: shown.rows[index], index };
          }
        } else if (rows.some((r) => r.id === id)) {
          current.active = { kind, id };
        }
      }
    }
    setShown(current);
  }

  // The deleted row leaves once its exit has played.
  const exiting = current.exiting;
  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(
      () => setShown((s) => (s.exiting === exiting ? { ...s, exiting: null } : s)),
      exitDuration(reduceMotion),
    );
    return () => clearTimeout(timer);
  }, [exiting, reduceMotion]);

  const display =
    exiting && !rows.some((r) => r.id === exiting.row.id)
      ? [...rows.slice(0, exiting.index), exiting.row, ...rows.slice(exiting.index)]
      : rows;

  return {
    rows: display,
    changeFor: (id) =>
      exiting?.row.id === id ? 'deleted' : current.active?.id === id ? current.active.kind : null,
  };
}

/**
 * Plays a row's change. Rows without one get no wrapper at all, so a long list pays nothing; the
 * changed row is remounted inside the animated wrapper, which is cheap for one row.
 */
export function RowMotion({ change, children }: { change: RowChange | null; children: ReactNode }) {
  if (!change) return children;
  return <ChangingRow change={change}>{children}</ChangingRow>;
}

function ChangingRow({ change, children }: { change: RowChange; children: ReactNode }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const moving = !reduceMotion;
  const enter = useSharedValue(change === 'created' ? 0 : 1);
  const exit = useSharedValue(0);
  const flash = useSharedValue(change === 'updated' ? 1 : 0);
  // -1: no fixed height, the row sizes itself. A new row starts at 0 and grows.
  const height = useSharedValue(change === 'created' && moving ? 0 : -1);
  const started = useRef(false);

  useEffect(() => {
    const fade = { duration: durations.reducedFade, ...never };
    if (change === 'created') {
      enter.set(withTiming(1, moving ? { duration: durations.saved, easing: easeOut, ...never } : fade));
    }
    if (change === 'updated') {
      flash.set(withTiming(0, moving ? { duration: durations.saved, easing: easeOut, ...never } : fade));
    }
    if (change === 'deleted') {
      exit.set(withTiming(1, { duration: exitDuration(reduceMotion), easing: easeIn, ...never }));
    }
  }, [change, moving, reduceMotion, enter, flash, exit]);

  // Heights need the row's natural height, known once it lays out.
  const onLayout = (rowHeight: number) => {
    if (started.current || !moving) return;
    if (change === 'created') {
      started.current = true;
      height.set(withTiming(rowHeight, { duration: durations.saved, easing: easeOut, ...never }));
    }
    if (change === 'deleted') {
      started.current = true;
      height.set(rowHeight);
      height.set(withTiming(0, { duration: durations.deleted, easing: easeIn, ...never }));
    }
  };

  const style = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - exit.value),
    height: height.value < 0 ? 'auto' : height.value,
    transform: [
      { translateX: moving ? distances.deleteSlide * exit.value : 0 },
      { scale: moving ? createdRowScale + (1 - createdRowScale) * enter.value : 1 },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View
      testID={`row-${change}`}
      // A row on its way out cannot be opened.
      pointerEvents={change === 'deleted' ? 'none' : 'auto'}
      style={[styles.clip, style]}
    >
      {/* Not limited by the animated height, so it always reports the row's natural height. */}
      <View onLayout={(e) => onLayout(e.nativeEvent.layout.height)}>{children}</View>
      {change === 'updated' && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.rowFlash }, flashStyle]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
