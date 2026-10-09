import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Pace } from '@/domain/pace';
import { paceCardLabel } from '@/format/insights';

import { PaceChart } from './charts/PaceChart';
import { ShapePressable } from './glass';
import { PaceSentence } from './PaceSentence';
import { CardTitle } from './CardTitle';
import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

export type PaceCardContent =
  | { kind: 'loading' }
  | { kind: 'ready'; pace: Pace; onPress: () => void; reveal?: boolean };

/** The ready card's height at scale 1.0: one sentence line, the 64 dp chart and one legend line. */
const LOADING_MIN_HEIGHT = 122;
const TITLE = 'Spending pace';

/**
 * The summary's Spending pace card (contracts/ui-screens.md; design.md). Ready, the whole card is
 * one button that opens Insights; loading, it only holds its place and is not pressable.
 */
export function PaceCard({ content, tag }: { content: PaceCardContent; tag: string }) {
  const { colors } = useTheme();
  const card = [
    styles.card,
    { backgroundColor: colors.surface },
    colors.tileShadow !== '' && { boxShadow: colors.tileShadow },
  ];
  // A small, quiet title inside the card: the sentence and its color stand out (fine-tuning
  // 2026-10-09).
  const title = <CardTitle title={TITLE} inside />;

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
    <>
      <ShapePressable
        accessibilityRole="button"
        accessibilityLabel={paceCardLabel(pace.sentence, tag)}
        accessibilityHint="Opens Insights"
        onPress={onPress}
        style={card}
      >
        {/* One element for the screen reader: its label already says everything below. */}
        <View style={styles.body} importantForAccessibility="no-hide-descendants">
          <View style={styles.sentenceRow}>
            {/* Not a separate element here: the card's label starts with the title. */}
            <View style={styles.sentence}>
              {title}
              <PaceSentence sentence={pace.sentence} tag={tag} />
            </View>
            <Feather name="chevron-right" size={iconSize.button} color={colors.textMuted} />
          </View>
          <PaceChart variant="compact" pace={pace} reveal={reveal} />
        </View>
      </ShapePressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    gap: spacing.xs,
    minHeight: minTouch,
  },
  body: { gap: spacing.xs },
  sentenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sentence: { flex: 1, gap: spacing.xxs },
  loading: { minHeight: LOADING_MIN_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
