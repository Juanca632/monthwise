import * as Haptics from 'expo-haptics';

import { haptics } from '@/lib/haptics';

// design.md, Haptics: one haptic per action, for its result. The form and route suites check
// when each fires (saved, deleted, invalid, select); this checks the mapping.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

beforeEach(() => jest.clearAllMocks());

it.each([
  ['add', 'impactAsync', 'light'],
  ['monthChange', 'impactAsync', 'light'],
  ['select', 'selectionAsync', undefined],
  ['saved', 'notificationAsync', 'success'],
  ['deleted', 'impactAsync', 'medium'],
  ['invalid', 'notificationAsync', 'error'],
] as const)('%s plays %s(%s) once', (moment, fn, arg) => {
  haptics[moment]();
  const played = jest.mocked(Haptics[fn]);
  expect(played).toHaveBeenCalledTimes(1);
  if (arg) expect(played).toHaveBeenCalledWith(arg);
  const others = (['impactAsync', 'selectionAsync', 'notificationAsync'] as const).filter((f) => f !== fn);
  for (const other of others) expect(Haptics[other]).not.toHaveBeenCalled();
});

it('ignores a haptic that fails (no vibrator, setting off)', async () => {
  jest.mocked(Haptics.selectionAsync).mockReturnValueOnce(Promise.reject(new Error('unavailable')));
  expect(() => haptics.select()).not.toThrow();
  await Promise.resolve();
});
