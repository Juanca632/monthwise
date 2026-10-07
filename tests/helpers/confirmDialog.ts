import { act, fireEvent, screen, within } from '@testing-library/react-native';

/** The open confirmation dialog's title (ui/ConfirmDialog), or null when none is open. */
export function openDialog(): string | null {
  const dialog = screen.queryByTestId('confirm-dialog');
  return dialog ? (within(dialog).getByRole('header').props.children as string) : null;
}

/** The open dialog's button labels, in order. */
export function dialogButtons(): string[] {
  return within(screen.getByTestId('confirm-dialog'))
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string);
}

/** Presses the open dialog's button with this label. */
export function answerDialog(label: string): void {
  act(() => {
    fireEvent.press(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: label }));
  });
}
