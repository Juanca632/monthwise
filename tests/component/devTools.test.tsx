import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { openAndMigrate } from '@/data/migrations';
import { isSimulatingStorageError, setSimulateStorageError } from '@/dev/storageErrorFlag';

import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

jest.mock('@/hooks/useToday', () => ({ getToday: () => '2026-10-15' }));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
const mockDatabase: { db?: TestDatabase } = {};
jest.mock('@/data/DatabaseProvider', () => ({ useDatabase: () => mockDatabase }));

const { DevTools } = require('@/dev/DevTools');

let db: TestDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await openAndMigrate(db);
  mockDatabase.db = db;
  setSimulateStorageError(false);
});

afterEach(() => db.close());

const count = async () =>
  (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))!.n;

describe('DevTools', () => {
  it('seeds 1,000 transactions and reloads the summary', async () => {
    const onChanged = jest.fn();
    render(<DevTools onChanged={onChanged} />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Seed 1,000 transactions' }));
    });

    expect(await count()).toBe(1000);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Seed 1,000 transactions')).toBeTruthy();
  });

  it('seeds 1,000 transactions in each of seven months and reloads the summary (SC-002)', async () => {
    const onChanged = jest.fn();
    render(<DevTools onChanged={onChanged} />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Seed 7 months' }));
    });

    expect(await count()).toBe(7000);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Seed 7 months')).toBeTruthy();
  });

  it('runs one seed at a time: both buttons are disabled while one seeds', async () => {
    render(<DevTools onChanged={jest.fn()} />);

    fireEvent.press(screen.getByRole('button', { name: 'Seed 7 months' }));

    expect(screen.getByText('Seeding…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Seed 7 months' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seed 1,000 transactions' })).toBeDisabled();
    // Let the seed finish before the database closes.
    await waitFor(() => expect(screen.getByText('Seed 7 months')).toBeTruthy(), { timeout: 10_000 });
  });

  it('is disabled until the database is open', () => {
    mockDatabase.db = undefined;
    render(<DevTools onChanged={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Seed 1,000 transactions' })).toBeDisabled();
  });

  it('turns the simulated storage error on and off, reloading each time', () => {
    const onChanged = jest.fn();
    render(<DevTools onChanged={onChanged} />);
    const toggle = screen.getByLabelText('Simulate storage error');

    fireEvent(toggle, 'valueChange', true);
    expect(isSimulatingStorageError()).toBe(true);

    fireEvent(toggle, 'valueChange', false);
    expect(isSimulatingStorageError()).toBe(false);
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});

describe('summary screen with EXPO_PUBLIC_DEV_TOOLS=1', () => {
  it('loads the dev tools module', () => {
    process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
    const required: string[] = [];
    jest.isolateModules(() => {
      jest.doMock('@/dev/DevTools', () => {
        required.push('DevTools');
        return { DevTools: () => null };
      });
      require('@/app/index');
    });
    delete process.env.EXPO_PUBLIC_DEV_TOOLS;
    expect(required).toEqual(['DevTools']);
  });
});
