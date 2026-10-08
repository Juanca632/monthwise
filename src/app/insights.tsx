import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monthTitle } from '@/format/date';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { PressableScale } from '@/ui/motion';
import { iconSize, minTouch, radii, spacing, useTheme } from '@/ui/theme';

/**
 * Insights for the selected month (contracts/ui-screens.md, Insights screen). For now only the
 * header; the sections and design.md's look come with the user stories (T028). Android's back
 * pops this stack screen on its own, like `/transactions`.
 */
export default function InsightsScreen() {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selected } = useSelectedMonth();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: spacing.xs + insets.top }]}>
      <View style={styles.header}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          android_ripple={{ color: colors.ripple, borderless: true, radius: minTouch / 2 }}
          style={[styles.back, { backgroundColor: colors.surface }]}
        >
          <Feather name="chevron-left" size={iconSize.button} color={colors.text} />
        </PressableScale>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={[type.label, { color: colors.textMuted }]}>
            Insights
          </Text>
          <Text style={[type.heading, { color: colors.text }]}>{monthTitle(selected)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  back: {
    width: minTouch,
    height: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
});
