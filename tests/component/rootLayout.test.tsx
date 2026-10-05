import { act, render, screen, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { logTiming } from '@/lib/devLog';

// Development leaves the console and the global error handler alone.
jest.mock('@/lib/variant', () => ({ getVariant: () => 'development' }));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));

let mockFonts: [boolean, Error | null] = [false, null];
jest.mock('expo-font', () => ({
  useFonts: () => mockFonts,
  isLoaded: () => mockFonts[0],
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

// The real Stack needs a navigation container; here it only shows that the screens rendered.
jest.mock('expo-router', () => {
  const { Text: RNText } = require('react-native');
  const Stack = () => <RNText>app screens</RNText>;
  Stack.Screen = () => null;
  return { Stack };
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

const RootLayout = require('@/app/_layout').default;

beforeEach(() => {
  jest.mocked(SplashScreen.hideAsync).mockClear();
  mockOpen.mockReset();
  mockOpen.mockImplementation(async () => {
    const { openTestDatabase } = require('../helpers/betterSqliteAdapter');
    const db = openTestDatabase();
    return Object.assign(db, { closeAsync: async () => db.close() });
  });
});

it('keeps the splash at module load', () => {
  expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
});

it('renders the app and hides the splash after the fonts load', async () => {
  mockFonts = [true, null];
  render(<RootLayout />);
  await act(async () => {});

  expect(screen.getByText('app screens')).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  await waitFor(() => {
    const timings = jest.mocked(logTiming).mock.calls.map(([name]) => name);
    expect(timings).toEqual(expect.arrayContaining(['bundle-ready', 'fonts-ready', 'db-open']));
  });
});

it('renders the app with the system font and hides the splash when the fonts fail', async () => {
  mockFonts = [false, new Error('font failed')];
  render(<RootLayout />);
  await act(async () => {});

  expect(screen.getByText('app screens')).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});

it('starts opening the database before the fonts finish', async () => {
  mockFonts = [false, null];
  const { rerender } = render(<RootLayout />);
  await act(async () => {});

  expect(mockOpen).toHaveBeenCalledWith('monthwise.db');
  expect(screen.queryByText('app screens')).toBeNull();
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

  mockFonts = [true, null];
  rerender(<RootLayout />);
  await act(async () => {});
  expect(screen.getByText('app screens')).toBeTruthy();
  expect(mockOpen).toHaveBeenCalledTimes(1);
});
