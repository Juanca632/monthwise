// The summary's entrance and month-change motion (design.md, Motion: "Summary appears" and
// "Change month"). Content decides whether to animate once, when it mounts, so rows that mount
// later by scrolling never animate and a same-month reload (after a save) never slides.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { distances, durations, easeOut, useReduceMotion } from './motion';

export type SummaryMotion = {
  /** When the summary mounted: the cold start. */
  entranceStart: number;
  /** The last month change and the side its content comes in from (the button tapped). */
  monthChange: { at: number; from: 'left' | 'right' } | null;
};

const SummaryMotionContext = createContext<SummaryMotion | null>(null);
export const SummaryMotionProvider = SummaryMotionContext.Provider;

/** Only rows that mount this soon after the summary rise in: those of the first load. */
const ENTRANCE_WINDOW = 1500;
/** Content of the new month that mounts this soon after the change slides in. */
const MONTH_WINDOW = 1000;
/** About the rows a first screen shows; later rows never animate. */
export const MAX_ANIMATED_ROWS = 8;

type Plan = { delay: number; duration: number; dx: number; dy: number };
type Moment = 'entrance' | 'month';

function planFor(motion: SummaryMotion | null, on: readonly Moment[], slot: number, now: number): Plan | null {
  if (!motion) return null;
  // A month change wins: a quick tap right after the cold start still slides sideways.
  const change = motion.monthChange;
  if (on.includes('month') && change && now - change.at < MONTH_WINDOW) {
    const dx = change.from === 'left' ? -distances.monthSlide : distances.monthSlide;
    return { delay: 0, duration: durations.monthChange, dx, dy: 0 };
  }
  const sinceStart = now - motion.entranceStart;
  if (on.includes('entrance') && sinceStart < ENTRANCE_WINDOW) {
    // 80 ms apart from the cold start. Content that arrives late (the first query) keeps the
    // same spacing among itself instead of all appearing at once.
    const { entranceStagger: step } = durations;
    const delay = Math.max(slot * step - sinceStart, (slot - 1) * step, 0);
    return { delay, duration: durations.entrance, dx: 0, dy: distances.entranceRise };
  }
  return null;
}

type Props = {
  /** Which moments this content animates in. */
  on: readonly Moment[];
  /** Its place in the entrance order: card 0, breakdown 1, then Add and the rows. */
  slot?: number;
  /** False keeps the wrapper (so a row never remounts when its index changes) but never animates. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Rises in on the cold start or slides in on a month change; under reduce motion it just shows. */
export function Appear({ on, slot = 0, enabled = true, style, children }: Props) {
  const motion = useContext(SummaryMotionContext);
  const reduceMotion = useReduceMotion();
  // Decided once, at mount.
  const [plan] = useState(() =>
    reduceMotion || !enabled ? null : planFor(motion, on, slot, Date.now()),
  );
  if (!plan) return <View style={style}>{children}</View>;
  return (
    <Moving plan={plan} style={style}>
      {children}
    </Moving>
  );
}

function Moving({ plan, style, children }: { plan: Plan; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        plan.delay,
        withTiming(1, { duration: plan.duration, easing: easeOut, reduceMotion: ReduceMotion.Never }),
      ),
    );
  }, [plan, progress]);

  const animated = useAnimatedStyle(() => {
    const rest = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: [{ translateX: plan.dx * rest }, { translateY: plan.dy * rest }],
    };
  });

  return (
    <Animated.View testID="appearing" style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
