import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monthTitle } from '@/format/date';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

import { ShapePressable } from './glass';
import { MonthPicker } from './MonthPicker';
import { iconSize, minTouch, radii, spacing, useTheme, type CardTone } from './theme';

/** The chevron on the balance card is smaller than the title's (design.md, Month control). */
const CARD_CHEVRON = 16;

type Props =
  /** On the balance card: a tinted glass pill in the card's ink. */
  | { variant: 'card'; tone: CardTone }
  /** On Insights: the screen's title. */
  | { variant: 'title' };

/**
 * The selected month as one button that opens the month picker (FR-026, contracts/ui-screens.md,
 * Month control). It works in every state, so a failing or slow month never traps the user.
 */
export function MonthControl(props: Props) {
  const { colors, type } = useTheme();
  const { selected, today, setSelected } = useSelectedMonth();
  const [open, setOpen] = useState(false);
  const title = monthTitle(selected);

  const control =
    props.variant === 'card' ? (
      <ShapePressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="Changes the month"
        onPress={() => setOpen(true)}
        overlay={props.tone.cardRim}
        style={[styles.pill, { backgroundColor: props.tone.monthButton, borderColor: props.tone.cardRim }]}
      >
        <Text style={[type.monthTitle, styles.shrink, { color: props.tone.cardInk }]}>{title}</Text>
        <Feather name="chevron-down" size={CARD_CHEVRON} color={props.tone.cardInk} />
      </ShapePressable>
    ) : (
      <ShapePressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="Changes the month"
        onPress={() => setOpen(true)}
        style={styles.title}
      >
        <Text style={[type.heading, styles.shrink, { color: colors.text }]}>{title}</Text>
        <Feather name="chevron-down" size={iconSize.button} color={colors.textMuted} />
      </ShapePressable>
    );

  return (
    <>
      {/* Behind the open picker the control is not a screen reader element: the picker's own
          month buttons carry the same names. */}
      <View importantForAccessibility={open ? 'no-hide-descendants' : 'auto'} style={styles.wrap}>
        {control}
      </View>
      {open && (
        <MonthPicker
          selected={selected}
          today={today}
          onClose={() => setOpen(false)}
          onChoose={(month) => {
            setOpen(false);
            setSelected(month);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: minTouch,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  title: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: minTouch,
    borderRadius: radii.segment,
  },
  // The month wraps under itself at large text; the chevron stays after it (design.md).
  shrink: { flexShrink: 1 },
});
