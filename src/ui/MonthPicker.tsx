import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { compareMonths, monthOf, pickerYear, type IsoDate, type YearMonth } from '@/domain/month';
import { monthTitle } from '@/format/date';
import { shortMonthName } from '@/format/insights';
import { haptics } from '@/lib/haptics';

import { ShapePressable } from './glass';
import { durations, easeOut, useReduceMotion } from './motion';
import { iconSize, minTouch, radii, spacing, useTheme } from './theme';

const OPEN_SCALE = 0.94;
/** The month grid slides in this far from the side of the year arrow tapped (design.md, Motion). */
const YEAR_SLIDE = 12;
const DISABLED_OPACITY = 0.4;
const CELL_BORDER = 1.5;
const COLUMNS = 3;
const never = { reduceMotion: ReduceMotion.Never };

type Props = {
  selected: YearMonth;
  today: IsoDate;
  onChoose(month: YearMonth): void;
  onClose(): void;
};

/**
 * The month picker (contracts/ui-screens.md, Month picker; design.md), built like 001's
 * ConfirmDialog: a modal card over a scrim. It opens on the selected month's year; Close, Android
 * back and a tap on the scrim close it with the month unchanged.
 */
export function MonthPicker({ selected, today, onChoose, onClose }: Props) {
  const { colors, type } = useTheme();
  const reduceMotion = useReduceMotion();
  const [year, setYear] = useState(selected.year);
  // The side the new year's grid comes in from: the arrow tapped.
  const [from, setFrom] = useState<-1 | 1>(1);
  const page = pickerYear(year, selected, today);

  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(1, { duration: durations.dialog, easing: easeOut, ...never }));
  }, [shown]);
  const backdrop = useAnimatedStyle(() => ({ opacity: shown.value }));
  // The card turns opaque in the first half of the motion, so the screen behind never shows
  // through it for long (fine-tuning 2026-10-09). Closing stays instant, as 001's dialog.
  const card = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 2),
    transform: [{ scale: reduceMotion ? 1 : OPEN_SCALE + (1 - OPEN_SCALE) * shown.value }],
  }));

  const changeYear = (delta: -1 | 1) => {
    haptics.select();
    setFrom(delta);
    setYear((y) => y + delta);
  };

  const choose = (month: YearMonth) => {
    // Choosing the month already shown only closes (contract).
    if (compareMonths(month, selected) === 0) return onClose();
    haptics.monthChange();
    onChoose(month);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.center}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdrop]}>
          {/* Not a screen reader element: Close serves that purpose (contract). */}
          <Pressable accessible={false} testID="month-picker-scrim" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          testID="month-picker"
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface }, card]}
        >
          <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
            Choose month
          </Text>

          <View style={styles.yearRow}>
            <YearButton label="Previous year" icon="chevron-left" enabled={page.canGoPrevious} onPress={() => changeYear(-1)} />
            <Text accessibilityLabel={String(year)} style={[type.title, styles.year, { color: colors.text }]}>
              {year}
            </Text>
            <YearButton label="Next year" icon="chevron-right" enabled={page.canGoNext} onPress={() => changeYear(1)} />
          </View>

          <Animated.View
            key={year}
            testID="month-grid"
            entering={
              reduceMotion
                ? undefined
                : new Keyframe({
                    0: { opacity: 0, transform: [{ translateX: from * YEAR_SLIDE }] },
                    100: { opacity: 1, transform: [{ translateX: 0 }], easing: easeOut },
                  }).duration(durations.fast)
            }
            style={styles.grid}
          >
            {page.months.map(({ month, selected: isSelected, available }) => {
              const isCurrent = compareMonths(month, monthOf(today)) === 0;
              return (
                <ShapePressable
                  key={month.month}
                  accessibilityRole="button"
                  accessibilityLabel={monthTitle(month)}
                  accessibilityState={{ selected: isSelected, disabled: !available }}
                  disabled={!available}
                  onPress={() => choose(month)}
                  overlay={isSelected ? colors.rippleOnAccent : undefined}
                  style={[
                    styles.cell,
                    available
                      ? {
                          backgroundColor: isSelected ? colors.accent : colors.insetFill,
                          borderColor: isSelected || isCurrent ? colors.accent : 'transparent',
                        }
                      : { borderColor: 'transparent', opacity: DISABLED_OPACITY },
                  ]}
                >
                  <Text
                    style={[
                      isSelected ? type.bodyStrong : type.body,
                      { color: isSelected ? colors.onAccent : colors.text },
                    ]}
                  >
                    {shortMonthName(month)}
                  </Text>
                </ShapePressable>
              );
            })}
          </Animated.View>

          <View style={styles.footer}>
            <FooterButton label="This month" ink={colors.accent} onPress={() => choose(monthOf(today))} />
            <FooterButton label="Close" ink={colors.text} onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function YearButton({
  label,
  icon,
  enabled,
  onPress,
}: {
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  enabled: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();
  return (
    <ShapePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.yearButton, { backgroundColor: colors.insetFill }, !enabled && { opacity: DISABLED_OPACITY }]}
    >
      <Feather name={icon} size={iconSize.button} color={colors.text} />
    </ShapePressable>
  );
}

function FooterButton({ label, ink, onPress }: { label: string; ink: string; onPress(): void }) {
  const { colors, type } = useTheme();
  return (
    <ShapePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.footerButton, { backgroundColor: colors.insetFill }]}
    >
      <Text style={[type.button, { color: ink }]}>{label}</Text>
    </ShapePressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 360, borderRadius: radii.sheet, padding: spacing.xl, gap: spacing.md },
  yearRow: { flexDirection: 'row', alignItems: 'center' },
  year: { flex: 1, textAlign: 'center' },
  yearButton: {
    width: minTouch,
    height: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cell: {
    // Three per row with two gaps between them.
    flexBasis: `${100 / COLUMNS - 4}%`,
    flexGrow: 1,
    minHeight: minTouch,
    borderRadius: radii.input,
    borderWidth: CELL_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  footerButton: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
