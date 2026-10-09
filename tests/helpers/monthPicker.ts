import { act, fireEvent, screen } from '@testing-library/react-native';

import type { YearMonth } from '@/domain/month';

// 002 replaced 001's month arrows with the month control and its picker (FR-026). Component
// suites reach another month the way a user does: open the control, step to the year, tap.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const title = (m: YearMonth) => `${MONTHS[m.month - 1]} ${m.year}`;

/** The month control: the only button labelled like `October 2026` outside the picker. */
export const monthControl = (name?: string) =>
  screen.getByRole('button', { name: name ?? /^[A-Z][a-z]+ \d{4}$/ });

/** Opens the picker from the control on screen. */
export async function openPicker() {
  fireEvent.press(monthControl());
  await act(async () => {});
}

/** Opens the picker, steps to the target's year and chooses the month. */
export async function pickMonth(target: YearMonth) {
  await openPicker();
  let shown = Number(screen.getByLabelText(/^\d{4}$/).props.accessibilityLabel);
  while (shown !== target.year) {
    fireEvent.press(screen.getByRole('button', { name: shown > target.year ? 'Previous year' : 'Next year' }));
    shown += shown > target.year ? -1 : 1;
  }
  fireEvent.press(screen.getByRole('button', { name: title(target) }));
  await act(async () => {});
}
