// Preview-only dev tools (contracts/ui-screens.md). The summary loads this module with `require`
// inside the EXPO_PUBLIC_DEV_TOOLS branch, so production bundles never contain it.
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { getToday } from '@/hooks/useToday';
import { reportError } from '@/lib/reportError';
import { minTouch, radii, spacing, useTheme } from '@/ui/theme';

import { seedCurrentMonth, seedSevenMonths } from './seed';
import { isSimulatingStorageError, setSimulateStorageError } from './storageErrorFlag';

type Props = {
  /** Reloads the summary after the data or the simulated error changed. */
  onChanged(): void;
};

/** The seed buttons and the storage-error switch, at the bottom of the summary. */
export function DevTools({ onChanged }: Props) {
  const { colors, type } = useTheme();
  const { db } = useDatabase();
  const [seeding, setSeeding] = useState<'month' | 'seven' | null>(null);
  const [simulating, setSimulating] = useState(isSimulatingStorageError);
  // One seed at a time: both write in one SQL transaction.
  const disabled = !db || seeding !== null;

  const seed = (which: 'month' | 'seven') => {
    if (!db || seeding) return;
    setSeeding(which);
    // Today at tap time, like the forms, so midnight is never missed.
    (which === 'month' ? seedCurrentMonth : seedSevenMonths)(db, getToday())
      .catch(() => reportError('seed'))
      .finally(() => {
        setSeeding(null);
        onChanged();
      });
  };

  const toggle = (on: boolean) => {
    setSimulateStorageError(on);
    setSimulating(on);
    // Reload right away, so the error state (or its recovery) shows without leaving the screen.
    onChanged();
  };

  return (
    <View style={styles.box}>
      <SeedButton
        label="Seed 1,000 transactions"
        busy={seeding === 'month'}
        disabled={disabled}
        onPress={() => seed('month')}
      />
      <SeedButton
        label="Seed 7 months"
        busy={seeding === 'seven'}
        disabled={disabled}
        onPress={() => seed('seven')}
      />
      <View style={styles.row}>
        <Text style={[type.body, styles.flex, { color: colors.text }]}>Simulate storage error</Text>
        <Switch
          accessibilityLabel="Simulate storage error"
          value={simulating}
          onValueChange={toggle}
        />
      </View>
    </View>
  );
}

type SeedButtonProps = { label: string; busy: boolean; disabled: boolean; onPress(): void };

function SeedButton({ label, busy, disabled, onPress }: SeedButtonProps) {
  const { colors, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      style={[styles.button, { backgroundColor: colors.surfaceMuted }]}
    >
      <Text style={[type.button, { color: colors.text }]}>{busy ? 'Seeding…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: spacing.md, marginTop: spacing.xl, gap: spacing.sm },
  button: {
    minHeight: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
