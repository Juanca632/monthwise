// Preview-only dev tools (contracts/ui-screens.md). The summary loads this module with `require`
// inside the EXPO_PUBLIC_DEV_TOOLS branch, so production bundles never contain it.
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { getToday } from '@/hooks/useToday';
import { reportError } from '@/lib/reportError';
import { minTouch, radii, spacing, useTheme } from '@/ui/theme';

import { seedCurrentMonth } from './seed';
import { isSimulatingStorageError, setSimulateStorageError } from './storageErrorFlag';

type Props = {
  /** Reloads the summary after the data or the simulated error changed. */
  onChanged(): void;
};

/** The seed button and the storage-error switch, at the bottom of the summary. */
export function DevTools({ onChanged }: Props) {
  const { colors, type } = useTheme();
  const { db } = useDatabase();
  const [seeding, setSeeding] = useState(false);
  const [simulating, setSimulating] = useState(isSimulatingStorageError);
  const disabled = !db || seeding;

  const seed = () => {
    if (!db || seeding) return;
    setSeeding(true);
    // Today at tap time, like the forms, so midnight is never missed.
    seedCurrentMonth(db, getToday())
      .catch(() => reportError('seed'))
      .finally(() => {
        setSeeding(false);
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seed 1,000 transactions"
        accessibilityState={{ disabled, busy: seeding }}
        disabled={disabled}
        onPress={seed}
        android_ripple={{ color: colors.ripple }}
        style={[styles.button, { backgroundColor: colors.surfaceMuted }]}
      >
        <Text style={[type.button, { color: colors.text }]}>
          {seeding ? 'Seeding…' : 'Seed 1,000 transactions'}
        </Text>
      </Pressable>
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
