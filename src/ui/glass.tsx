// The glass look from design.md (Glass surfaces): translucent cards, accent buttons and the
// ambient background, all drawn with gradients and shadows that every supported Android renders.
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  durations,
  easeOut,
  PressableScale,
  useReduceMotion,
  type PressableScaleProps,
} from './motion';
import { insetHighlight, minTouch, radii, spacing, useTheme, type BalanceTone } from './theme';

type GlassCardProps = {
  radius: number;
  /** A plain fill; gradient fills go in `background`. */
  fill?: string;
  border: string;
  /** The 1 dp inner top highlight. */
  highlight?: boolean;
  /** A `boxShadow` value for the outer wrapper. */
  shadow?: string;
  /** The wrapper: margins and position. */
  style?: StyleProp<ViewStyle>;
  /** The clipping inner view: padding and layout. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Drawn under the content, inside the clip (gradient layers). */
  background?: ReactNode;
  children?: ReactNode;
};

/**
 * A glass card. The shadow goes on an outer wrapper that does not clip, and the fill and content
 * on an inner view that clips, so the shadow is not cut off and children (ripples, gradient
 * layers) stay inside the rounded shape (design.md, Glass surfaces).
 */
export function GlassCard({
  radius,
  fill,
  border,
  highlight = false,
  shadow,
  style,
  contentStyle,
  background,
  children,
}: GlassCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ borderRadius: radius }, shadow !== undefined && { boxShadow: shadow }, style]}>
      <View
        style={[
          styles.clip,
          { borderRadius: radius, borderColor: border, backgroundColor: fill },
          contentStyle,
        ]}
      >
        {background}
        {/* Its own layer, so the gradient layers in `background` never cover it. */}
        {highlight && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radius - 1, boxShadow: insetHighlight(colors.glassHighlight) },
            ]}
          />
        )}
        {children}
      </View>
    </View>
  );
}

type ShapePressableProps = Omit<PressableScaleProps, 'children'> & {
  /** The pressed overlay's color; `ripple` by default. */
  overlay?: string;
  children?: ReactNode;
};

/**
 * A pressable with its own rounded shape. `android_ripple` is not clipped to rounded corners
 * (glass spike), so it shows an overlay inside the shape from press-in until release instead
 * (design.md, Touch feedback).
 */
export function ShapePressable({ style, overlay, children, ...props }: ShapePressableProps) {
  const { colors } = useTheme();
  return (
    <PressableScale {...props} style={[styles.shape, style]}>
      {({ pressed }) => (
        <>
          {children}
          {pressed && (
            <View
              testID="pressed-overlay"
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: overlay ?? colors.ripple }]}
            />
          )}
        </>
      )}
    </PressableScale>
  );
}

/** Add and Save: an opaque accent gradient with a white border and the highlight; no glow. */
export function AccentButton({ style, ...props }: Omit<ShapePressableProps, 'overlay'>) {
  const { colors } = useTheme();
  return (
    <ShapePressable
      {...props}
      overlay={colors.rippleOnAccent}
      style={[
        styles.accent,
        {
          experimental_backgroundImage: colors.accentGradient,
          borderColor: colors.accentBorder,
          boxShadow: insetHighlight(colors.glassHighlight),
        },
        style,
      ]}
    />
  );
}

const TONES: readonly BalanceTone[] = ['positive', 'negative'];

/**
 * One layer per balance tone, stacked; the current tone's layer is shown. A gradient cannot be
 * interpolated, so a tone change fades the old layer out and the new one in over 600 ms, or swaps
 * them under reduce motion (design.md, Motion, "Tone change").
 */
export function ToneCrossfade({
  tone,
  renderLayer,
  testID,
}: {
  tone: BalanceTone;
  renderLayer(tone: BalanceTone): ReactNode;
  /** Each layer gets `${testID}-${tone}`. */
  testID: string;
}) {
  return (
    <>
      {TONES.map((t) => (
        <ToneLayer key={t} testID={`${testID}-${t}`} active={t === tone}>
          {renderLayer(t)}
        </ToneLayer>
      ))}
    </>
  );
}

function ToneLayer({ testID, active, children }: { testID: string; active: boolean; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  // The first render shows the current tone right away; only later changes fade.
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    opacity.set(
      reduceMotion ? target : withTiming(target, { duration: durations.toneChange, easing: easeOut, reduceMotion: ReduceMotion.Never }),
    );
  }, [active, reduceMotion, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animated]}
    >
      {children}
    </Animated.View>
  );
}

// Each glow is a disk with a soft edge: solid out to the disk's radius, then a 70 dp fade
// (design.md, Glass surfaces; sizes checked in the glass spike).
const GLOW_FADE = 70;
const TOP_GLOW = 340;
const BOTTOM_GLOW = 300;

/** The same color fully transparent, so the fade does not pass through grey. */
const clear = (rgba: string) => rgba.replace(/[\d.]+\)$/, '0)');

function glow(color: string, diameter: number): string {
  const solid = Math.round((diameter / 2 / (diameter / 2 + GLOW_FADE)) * 100);
  return `radial-gradient(circle closest-side, ${color} 0%, ${color} ${solid}%, ${clear(color)} 100%)`;
}

const glowBox = (diameter: number) => diameter + 2 * GLOW_FADE;

/**
 * The summary's ambient background: a top-left glow in the balance tone and a bottom-right one in
 * the income color. Decorative, so hidden from the screen reader.
 */
export function AmbientBackground({ tone }: { tone: BalanceTone }) {
  const { colors, cardTones } = useTheme();
  return (
    <View
      testID="ambient-background"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <ToneCrossfade
        tone={tone}
        testID="ambient-glow"
        renderLayer={(t) => (
          <View
            style={[
              styles.topGlow,
              { experimental_backgroundImage: glow(cardTones[t].ambientTop, TOP_GLOW) },
            ]}
          />
        )}
      />
      <View
        style={[
          styles.bottomGlow,
          { experimental_backgroundImage: glow(colors.ambientBottom, BOTTOM_GLOW) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { borderWidth: 1, overflow: 'hidden' },
  shape: { overflow: 'hidden' },
  accent: {
    minHeight: minTouch,
    borderWidth: 1,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  // Centers from the glass mockup: the top disk's at (50, 80) from the top-left corner, the bottom
  // one's 30 dp in from the right edge and 120 dp up from the bottom.
  topGlow: {
    position: 'absolute',
    width: glowBox(TOP_GLOW),
    height: glowBox(TOP_GLOW),
    left: 50 - glowBox(TOP_GLOW) / 2,
    top: 80 - glowBox(TOP_GLOW) / 2,
  },
  bottomGlow: {
    position: 'absolute',
    width: glowBox(BOTTOM_GLOW),
    height: glowBox(BOTTOM_GLOW),
    right: 30 - glowBox(BOTTOM_GLOW) / 2,
    bottom: 120 - glowBox(BOTTOM_GLOW) / 2,
  },
});
