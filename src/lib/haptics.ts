// One haptic per action, for its result (design.md, Haptics). Callers name the moment, not the
// feedback type, so the mapping lives only here.
import * as Haptics from 'expo-haptics';

// A haptic that fails (no vibrator, the system setting off) changes nothing for the user, so the
// error is dropped; it carries no data, and there is nothing to report.
const play = (feedback: Promise<void>) => {
  feedback.catch(() => {});
};

export const haptics = {
  /** Tap Add. */
  add: () => play(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Change month. */
  monthChange: () => play(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Type switch, pick a category. */
  select: () => play(Haptics.selectionAsync()),
  /** A successful save; Save itself has no tap haptic. */
  saved: () => play(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A successful delete, after its confirmation. */
  deleted: () => play(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Save with an invalid field. */
  invalid: () => play(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
