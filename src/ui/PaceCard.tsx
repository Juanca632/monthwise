import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Pace } from '@/domain/pace';
import { paceCardLabel, paceSentence } from '@/format/insights';

import { PaceChart } from './charts/PaceChart';
import { ShapePressable } from './glass';
import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

export type PaceCardContent =
  | { kind: 'loading' }
  | { kind: 'ready'; pace: Pace; onPress: () => void; reveal?: boolean };

/** One sentence line, the 64 dp chart and one legend line at scale 1.0 (design.md, Loading). */
const LOADING_MIN_HEIGHT = 122;
const TITLE = 'Spending pace';

/**
 * The summary's Spending pace card (contracts/ui-screens.md; design.md). Ready, the whole card is
 * one button that opens Insights; loading, it only holds its place and is not pressable.
 */
export function PaceCard({ content, tag }: { content: PaceCardContent; tag: string }) {
  const { colors, type } = useTheme();
  const card = [
    styles.card,
    { backgroundColor: colors.surface },
    colors.tileShadow !== '' && { boxShadow: colors.tileShadow },
  ];
  const title = <Text style={[type.labelStrong, styles.title, { color: colors.textMuted }]}>{TITLE}</Text>;

  if (content.kind === 'loading') {
    return (
      <View style={card}>
        {title}
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
        </View>
      </View>
    );
  }

  const { pace, onPress, reveal } = content;
  return (
    <ShapePressable
      accessibilityRole="button"
      accessibilityLabel={paceCardLabel(pace.sentence, tag)}
      accessibilityHint="Opens Insights"
      onPress={onPress}
      style={card}
    >
      {/* One element for the screen reader: its label already says everything below. */}
      <View style={styles.body} importantForAccessibility="no-hide-descendants">
        <View style={styles.titleRow}>
          {title}
          <Feather name="chevron-right" size={iconSize.button} color={colors.textMuted} />
        </View>
        <Text style={[type.title, { color: colors.text }]}>{paceSentence(pace.sentence, tag)}</Text>
        <PaceChart variant="compact" pace={pace} reveal={reveal} />
      </View>
    </ShapePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.xs,
    minHeight: minTouch,
  },
  body: { gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  loading: { minHeight: LOADING_MIN_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
