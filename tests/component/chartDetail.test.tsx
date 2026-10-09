import { render, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ChartDetail } from '@/ui/ChartDetail';
import { minTouch } from '@/ui/theme';

jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
// Suites run with reduce motion on by default (tests/setup/motion.ts); a test can turn it off.
let mockReduceMotion = true;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const LINES = ['Day 8', 'October: 120,00 €', 'September: 100,00 €', '+20,00 € · +20%'];

beforeEach(() => {
  mockReduceMotion = true;
});

it('shows each line as its own Text', () => {
  render(<ChartDetail lines={LINES} />);
  for (const line of LINES) expect(screen.getByText(line)).toBeTruthy();
});

it('shows the action button with its role, at least 48 dp tall', () => {
  render(
    <ChartDetail
      lines={['September']}
      action={
        <Pressable accessibilityRole="button" style={{ minHeight: minTouch }}>
          <Text>View month</Text>
        </Pressable>
      }
    />,
  );
  const button = screen.getByRole('button', { name: 'View month' });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(minTouch);
});

it('does not animate with reduce motion', () => {
  render(<ChartDetail lines={LINES} />);
  const box = screen.getByTestId('chart-detail');
  expect(box.props.entering).toBeUndefined();
  expect(box.props.exiting).toBeUndefined();
});

it('animates in and out with motion on', () => {
  mockReduceMotion = false;
  render(<ChartDetail lines={LINES} />);
  const box = screen.getByTestId('chart-detail');
  expect(box.props.entering).toBeDefined();
  expect(box.props.exiting).toBeDefined();
});
