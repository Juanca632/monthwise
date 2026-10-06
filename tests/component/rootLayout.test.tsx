import { act, render, screen, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import * as RN from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { logTiming } from '@/lib/devLog';
import { palettes } from '@/ui/theme';

// Development leaves the console and the global error handler alone.
jest.mock('@/lib/variant', () => ({ getVariant: () => 'development' }));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('@/lib/sinceStartup', () => ({ msSinceStartup: () => 416 }));

let mockFonts: [boolean, Error | null] = [false, null];
jest.mock('expo-font', () => ({
  useFonts: () => mockFonts,
  isLoaded: () => mockFonts[0],
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));

const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

// The real Stack needs a navigation container; here it only shows that the screens rendered.
// ThemeProvider records the theme it gets, so the test can check the navigator's background.
const mockNavigationTheme: { current: { dark: boolean; colors: Record<string, string> } | null } = {
  current: null,
};
jest.mock('expo-router', () => {
  const { Text: RNText } = require('react-native');
  const Stack = () => <RNText>app screens</RNText>;
  Stack.Screen = () => null;
  const ThemeProvider = ({ value, children }: { value: typeof mockNavigationTheme.current; children: unknown }) => {
    mockNavigationTheme.current = value;
    return children;
  };
  const theme = (dark: boolean) => ({ dark, colors: { background: dark ? '#000' : '#FFF', text: 'x' } });
  return { Stack, ThemeProvider, DarkTheme: theme(true), DefaultTheme: theme(false) };
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
    // Startup lines count from the runtime start, not from the clock origin.
    expect(logTiming).toHaveBeenCalledWith('bundle-ready', 416);
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

it('gives the navigator the app background, so closing a screen never flashes white', async () => {
  mockFonts = [true, null];
  const scheme = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  render(<RootLayout />);
  await act(async () => {});

  expect(mockNavigationTheme.current).toMatchObject({
    dark: true,
    colors: { background: palettes.dark.background, card: palettes.dark.background, text: 'x' },
  });
  scheme.mockRestore();
});

it('paints the native root view in the app background, which shows while a screen closes', async () => {
  mockFonts = [true, null];
  const scheme = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  const { rerender } = render(<RootLayout />);
  await act(async () => {});
  expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(palettes.dark.background);

  scheme.mockReturnValue('light');
  rerender(<RootLayout />);
  await act(async () => {});
  expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(palettes.light.background);
  scheme.mockRestore();
});

it('wraps the app in the gesture root, filling the screen in the app background', async () => {
  mockFonts = [true, null];
  const scheme = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
  render(<RootLayout />);
  await act(async () => {});

  const root = screen.UNSAFE_getByType(GestureHandlerRootView);
  expect(RN.StyleSheet.flatten(root.props.style)).toMatchObject({
    flex: 1,
    backgroundColor: palettes.dark.background,
  });
  expect(screen.getByText('app screens')).toBeTruthy();
  scheme.mockRestore();
});
