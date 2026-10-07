import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { next, previous } from '@/domain/month';
import { monthTitle } from '@/format/date';
import { haptics } from '@/lib/haptics';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

import { PressableScale } from './motion';
import { iconSize, minTouch, radii, useTheme, type CardTone } from './theme';

type Props = { tone: CardTone };

/**
 * The balance card's header row: previous month, the month title, next month (design.md). It
 * works in every summary state, so a failing or slow month never traps the user (contract).
 */
export function MonthHeader({ tone }: Props) {
  const { type } = useTheme();
  const { selected, canGoPrevious, canGoNext, goPrevious, goNext } = useSelectedMonth();

  return (
    <View style={styles.row}>
      {/* FR-021: no previous on January 2000, no next on the current month. An empty slot of
          the same size keeps the title centered. */}
      {canGoPrevious ? (
        <MonthButton
          label={`Previous month, ${monthTitle(previous(selected))}`}
          icon="chevron-left"
          tone={tone}
          onPress={() => {
            haptics.monthChange();
            goPrevious();
          }}
        />
      ) : (
        <View style={styles.slot} />
      )}
      <Text accessibilityRole="header" style={[type.monthTitle, styles.title, { color: tone.cardInk }]}>
        {monthTitle(selected)}
      </Text>
      {canGoNext ? (
        <MonthButton
          label={`Next month, ${monthTitle(next(selected))}`}
          icon="chevron-right"
          tone={tone}
          onPress={() => {
            haptics.monthChange();
            goNext();
          }}
        />
      ) : (
        <View style={styles.slot} />
      )}
    </View>
  );
}

type MonthButtonProps = {
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  tone: CardTone;
  onPress(): void;
};

function MonthButton({ label, icon, tone, onPress }: MonthButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // A rounded view does not clip its own ripple; a borderless one draws a circle instead
      // (design.md, Touch feedback).
      android_ripple={{ color: tone.cardRim, borderless: true, radius: minTouch / 2 }}
      style={[
        styles.slot,
        styles.button,
        { backgroundColor: tone.monthButton, borderColor: tone.cardRim },
      ]}
    >
      <Feather name={icon} size={iconSize.button} color={tone.cardInk} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: minTouch, height: minTouch },
  button: {
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center' },
});
