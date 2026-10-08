import { fireEvent, render, screen } from '@testing-library/react-native';

import { SelectedMonthProvider } from '@/state/SelectedMonthContext';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-12',
  getToday: () => '2026-10-12',
}));
// Like the other component suites: the real expo-font needs expo-asset, which Jest cannot resolve.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const InsightsScreen = require('@/app/insights').default;

function renderInsights() {
  render(
    <SelectedMonthProvider>
      <InsightsScreen />
    </SelectedMonthProvider>,
  );
}

beforeEach(() => mockBack.mockClear());

describe('Insights screen header (placeholder)', () => {
  it('names the screen and shows the selected month', () => {
    renderInsights();
    expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy();
    expect(screen.getByText('October 2026')).toBeTruthy();
  });

  it('goes back with the Back button', () => {
    renderInsights();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
