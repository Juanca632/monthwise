// Placeholder until the summary screen (T037): shows that the shell, theme, fonts, month state
// and database are wired up.
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDatabase } from '@/data/DatabaseProvider';
import { monthTitle } from '@/format/date';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { spacing, useTheme } from '@/ui/theme';

export default function SummaryScreen() {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { selected } = useSelectedMonth();
  const { status } = useDatabase();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <Text style={[type.monthTitle, { color: colors.text }]}>{monthTitle(selected)}</Text>
      <Text style={[type.label, { color: colors.textMuted }]}>Database: {status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
