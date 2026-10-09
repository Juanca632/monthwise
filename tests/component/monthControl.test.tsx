import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as RN from 'react-native';

import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { MonthControl } from '@/ui/MonthControl';
import { cardTones, minTouch } from '@/ui/theme';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-12',
  getToday: () => '2026-10-12',
}));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));

const month: { current: SelectedMonthValue | null } = { current: null };
function Spy() {
  month.current = useSelectedMonth();
  return null;
}

function renderControl(variant: 'card' | 'title') {
  render(
    <SelectedMonthProvider>
      <Spy />
      {variant === 'card' ? <MonthControl variant="card" tone={cardTones.light.positive} /> : <MonthControl variant="title" />}
    </SelectedMonthProvider>,
  );
}

it.each(['card', 'title'] as const)('%s: one button with the month, the hint, at least 48 dp', (variant) => {
  renderControl(variant);
  const control = screen.getByRole('button', { name: 'October 2026' });
  expect(control.props.accessibilityHint).toBe('Changes the month');
  expect(RN.StyleSheet.flatten(control.props.style).minHeight).toBeGreaterThanOrEqual(minTouch);
  expect(screen.getByText('October 2026')).toBeTruthy();
});

it('opens the picker on the selected month and applies the month chosen', () => {
  renderControl('title');
  fireEvent.press(screen.getByRole('button', { name: 'October 2026' }));
  expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
  act(() => fireEvent.press(screen.getByRole('button', { name: 'March 2026' })));
  expect(month.current!.selected).toEqual({ year: 2026, month: 3 });
  expect(screen.queryByRole('header', { name: 'Choose month' })).toBeNull();
  expect(screen.getByRole('button', { name: 'March 2026' })).toBeTruthy();
});

it('Close leaves the month as it was', () => {
  renderControl('card');
  fireEvent.press(screen.getByRole('button', { name: 'October 2026' }));
  fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(month.current!.selected).toEqual({ year: 2026, month: 10 });
  expect(screen.queryByRole('header', { name: 'Choose month' })).toBeNull();
});
