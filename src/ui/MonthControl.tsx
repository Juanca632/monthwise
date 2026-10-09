import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monthTitle } from '@/format/date';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

import { ShapePressable } from './glass';
import { MonthPicker } from './MonthPicker';
import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

/**
 * The selected month as one button that opens the month picker (FR-026, contracts/ui-screens.md,
 * Month control): the title of the summary and of Insights. It works in every state, so a
 * failing or slow month never traps the user.
 */
export function MonthControl() {
  const { colors, type } = useTheme();
  const { selected, today, setSelected } = useSelectedMonth();
  const [open, setOpen] = useState(false);
  const title = monthTitle(selected);

  const control = (
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
      <View importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}>
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
