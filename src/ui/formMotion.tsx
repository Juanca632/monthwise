// The form's own motion (design.md, Motion: "Type switch", "Pick a category" and "Invalid Save").
// Under reduce motion the indicator and chips swap and nothing shakes.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, easeOut, spring, useReduceMotion } from './motion';
import { insetHighlight, radii, useTheme } from './theme';

const never = { reduceMotion: ReduceMotion.Never };
const SEGMENT_BORDER = 1.5;

/**
 * The selected Type segment: one indicator that slides between the two options with the spring.
 * It sits in the track's padding box (`inset` from its border), behind the segments' text.
 */
export function TypeIndicator({ index, inset, gap }: { index: 0 | 1; inset: number; gap: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [railWidth, setRailWidth] = useState(0);
  const position = useSharedValue<number>(index);
  const segmentWidth = (railWidth - gap) / 2;

  useEffect(() => {
    // Clamped, so it never passes the option it moves to.
    position.set(reduceMotion ? index : withSpring(index, { ...spring, overshootClamping: true, ...never }));
  }, [index, reduceMotion, position]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * (segmentWidth + gap) }],
  }));

  return (
    <View
      testID="type-rail"
      pointerEvents="none"
      style={[styles.rail, { top: inset, bottom: inset, left: inset, right: inset }]}
      onLayout={(e) => setRailWidth(e.nativeEvent.layout.width)}
    >
      {railWidth > 0 && (
        <Animated.View
          testID="type-indicator"
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              backgroundColor: colors.segmentIndicator,
              borderColor: colors.accent,
            },
            slide,
          ]}
        />
      )}
    </View>
  );
}

/** A chip's accent fill, fading in over 220 ms when it is picked (and out when another is). */
export function ChipFill({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const target = selected ? 1 : 0;
    fill.set(
      reduceMotion
        ? target
        : withTiming(target, { duration: durations.chipFill, easing: easeOut, ...never }),
    );
  }, [selected, reduceMotion, fill]);

  const fade = useAnimatedStyle(() => ({ opacity: fill.value }));
  return (
    <Animated.View
      testID={selected ? 'chip-fill-selected' : 'chip-fill'}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.chipFill,
        { backgroundColor: colors.accent, boxShadow: insetHighlight(colors.glassHighlight) },
        fade,
      ]}
    />
  );
}

const SHAKE = 6;
const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);

/** The first invalid field shakes 6 dp three times in 300 ms; under reduce motion it does not. */
export function useShake() {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const shake = () => {
    if (reduceMotion) return;
    // Three back-and-forth swings, then rest: seven legs share the 300 ms.
    const leg = (to: number) =>
      withTiming(to, { duration: durations.shake / 7, easing: easeInOut, ...never });
    offset.set(withSequence(leg(SHAKE), leg(-SHAKE), leg(SHAKE), leg(-SHAKE), leg(SHAKE), leg(-SHAKE), leg(0)));
  };
  return { style, shake };
}

const styles = StyleSheet.create({
  rail: { position: 'absolute' },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.segment,
    borderWidth: SEGMENT_BORDER,
  },
  chipFill: { borderRadius: radii.full },
});
