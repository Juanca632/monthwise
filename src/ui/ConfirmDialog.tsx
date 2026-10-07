// The app's own confirmation dialog, in place of the system Alert, so "Discard changes?" and
// "Delete this transaction?" look like the rest of the app (fine-tuning 2026-10-07).
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations, easeOut, PressableScale, useReduceMotion } from './motion';
import { minTouch, radii, spacing, useTheme } from './theme';

export type ConfirmRequest = {
  title: string;
  message: string;
  /** The safe choice: closes the dialog and changes nothing. */
  cancel: string;
  /** The destructive choice, drawn in `error`. */
  confirm: string;
  onConfirm(): void;
};

/**
 * `ask` opens the dialog; `dialog` is the element to render once, anywhere in the screen. Android's
 * back button and a tap outside the card both cancel, like the system dialog did.
 */
export function useConfirmDialog(): { dialog: ReactNode; ask(request: ConfirmRequest): void } {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const close = () => setRequest(null);
  const dialog = request && (
    <ConfirmDialog
      request={request}
      onCancel={close}
      onConfirm={() => {
        close();
        request.onConfirm();
      }}
    />
  );
  return { dialog, ask: setRequest };
}

const OPEN_SCALE = 0.94;
const never = { reduceMotion: ReduceMotion.Never };

function ConfirmDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: ConfirmRequest;
  onCancel(): void;
  onConfirm(): void;
}) {
  const { colors, type } = useTheme();
  const reduceMotion = useReduceMotion();
  const shown = useSharedValue(0);

  // Fades in and settles from 94 %; under reduce motion it only fades. Closing is instant, so the
  // chosen action never waits on the dialog.
  useEffect(() => {
    shown.set(
      withTiming(1, {
        duration: durations.dialog,
        easing: easeOut,
        ...never,
      }),
    );
  }, [shown, reduceMotion]);

  const backdrop = useAnimatedStyle(() => ({ opacity: shown.value }));
  const card = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: reduceMotion ? 1 : OPEN_SCALE + (1 - OPEN_SCALE) * shown.value }],
  }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.center}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdrop]}>
          <Pressable
            accessible={false}
            testID="confirm-dialog-backdrop"
            onPress={onCancel}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          testID="confirm-dialog"
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface }, card]}
        >
          <Text accessibilityRole="header" style={[type.title, { color: colors.text }]}>
            {request.title}
          </Text>
          <Text style={[type.body, styles.message, { color: colors.textMuted }]}>
            {request.message}
          </Text>
          <View style={styles.buttons}>
            <DialogButton
              label={request.cancel}
              onPress={onCancel}
              fill={colors.surfaceMuted}
              ink={colors.text}
              ripple={colors.ripple}
            />
            {/* White on the light theme's red, near black on the dark theme's lighter red. */}
            <DialogButton
              label={request.confirm}
              onPress={onConfirm}
              fill={colors.error}
              ink={colors.onError}
              ripple={colors.rippleOnAccent}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DialogButton({
  label,
  onPress,
  fill,
  ink,
  ripple,
}: {
  label: string;
  onPress(): void;
  fill: string;
  ink: string;
  ripple: string;
}): ReactNode {
  const { type } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: ripple }}
      style={[styles.button, { backgroundColor: fill }]}
    >
      <Text style={[type.button, { color: ink }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.sheet,
    padding: spacing.xl,
  },
  message: { marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  button: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
});
