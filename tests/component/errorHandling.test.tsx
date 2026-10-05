import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

type Handler = (error: unknown, isFatal?: boolean) => void;

let mockHandler: Handler | null = null;
(globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
  setGlobalHandler: (h: Handler) => {
    mockHandler = h;
  },
  getGlobalHandler: () => mockHandler,
};

// Production installs the silent handler; devLog output in preview is covered by logging.test.ts.
jest.mock('@/lib/variant', () => ({ getVariant: () => 'production' }));
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    const { openTestDatabase } = require('../helpers/betterSqliteAdapter');
    const db = openTestDatabase();
    return Object.assign(db, { closeAsync: async () => db.close() });
  },
}));

const layout = require('@/app/_layout');

const SECRET = 'Lunch 12,50 €';

function Fine() {
  return <Text>Summary</Text>;
}

let shouldThrow = true;
function Throws() {
  if (shouldThrow) throw new Error(SECRET);
  return <Text>Recovered</Text>;
}

const routes = (index: () => React.JSX.Element) => ({
  _layout: { default: layout.default, ErrorBoundary: layout.ErrorBoundary },
  index,
});

it('a render error shows the generic screen without the error message', async () => {
  shouldThrow = true;
  renderRouter(routes(Throws));
  await act(async () => {});

  expect(screen.getByText('Something went wrong.')).toBeTruthy();
  expect(screen.queryByText(SECRET, { exact: false })).toBeNull();

  shouldThrow = false;
  fireEvent.press(screen.getByText('Try again'));
  await act(async () => {});
  expect(screen.getByText('Recovered')).toBeTruthy();
});

it('a fatal global error shows the same screen; Try again re-renders the app', async () => {
  renderRouter(routes(Fine));
  await act(async () => {});
  expect(screen.getByText('Summary')).toBeTruthy();

  act(() => mockHandler?.(new Error(SECRET), true));
  expect(screen.getByText('Something went wrong.')).toBeTruthy();
  expect(screen.queryByText(SECRET, { exact: false })).toBeNull();

  fireEvent.press(screen.getByText('Try again'));
  await act(async () => {});
  expect(screen.getByText('Summary')).toBeTruthy();
});

it('a non-fatal global error leaves the app on screen', async () => {
  renderRouter(routes(Fine));
  await act(async () => {});

  act(() => mockHandler?.(new Error(SECRET), false));
  expect(screen.getByText('Summary')).toBeTruthy();
  expect(screen.queryByText('Something went wrong.')).toBeNull();
});
