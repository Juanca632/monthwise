import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { DatabaseContextValue } from '@/data/DatabaseProvider';

import { openTestDatabase } from '../helpers/betterSqliteAdapter';

const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...args: unknown[]) => mockOpen(...args) }));

/** An in-memory better-sqlite3 database shaped like expo-sqlite's, including closeAsync. */
const fakeExpoDb = () => {
  const db = openTestDatabase();
  return Object.assign(db, { closeAsync: async () => db.close() });
};

const sept = { year: 2026, month: 9 };
const input = {
  type: 'expense' as const,
  amountCents: 1250,
  date: '2026-09-15',
  category: 'food',
  note: null,
};

type Loaded = typeof import('@/data/DatabaseProvider');

function renderProvider(mod: Loaded) {
  const ref: { current: DatabaseContextValue | null } = { current: null };
  function Probe() {
    ref.current = mod.useDatabase();
    return <Text>{ref.current.status}</Text>;
  }
  render(
    <mod.DatabaseProvider>
      <Probe />
    </mod.DatabaseProvider>,
  );
  return ref;
}

const flush = () => act(async () => {});

beforeEach(() => {
  mockOpen.mockReset();
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
});

describe('without dev tools', () => {
  const mod: Loaded = require('@/data/DatabaseProvider');

  it('goes from loading to ready and exposes the repository', async () => {
    mockOpen.mockImplementation(async () => fakeExpoDb());
    const ctx = renderProvider(mod);
    expect(screen.getByText('loading')).toBeTruthy();
    expect(ctx.current?.repository).toBeNull();

    await flush();
    expect(screen.getByText('ready')).toBeTruthy();
    expect(mockOpen).toHaveBeenCalledWith('monthwise.db');
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(await ctx.current!.repository!.listByMonth(sept)).toEqual([]);
    expect(ctx.current?.db).toBeUndefined();
  });

  it('shows error when opening fails, and retry reopens', async () => {
    mockOpen.mockRejectedValueOnce(new Error('disk I/O error'));
    mockOpen.mockImplementation(async () => fakeExpoDb());
    const ctx = renderProvider(mod);

    await flush();
    expect(screen.getByText('error')).toBeTruthy();
    await expect(ctx.current!.whenReady()).rejects.toMatchObject({ code: 'db_open' });

    act(() => ctx.current!.retry());
    expect(screen.getByText('loading')).toBeTruthy();
    await flush();
    expect(screen.getByText('ready')).toBeTruthy();
    expect(mockOpen).toHaveBeenCalledTimes(2);
  });

  it('shows error when the migration fails and closes the database', async () => {
    const db = fakeExpoDb();
    const closeAsync = jest.spyOn(db, 'closeAsync');
    // A table with the same name makes the version 1 CREATE TABLE fail.
    db.raw.exec('CREATE TABLE transactions (x)');
    mockOpen.mockResolvedValue(db);
    renderProvider(mod);

    await flush();
    expect(screen.getByText('error')).toBeTruthy();
    expect(closeAsync).toHaveBeenCalled();
  });

  it('whenReady() called while opening resolves with the repository once open', async () => {
    let finishOpen!: () => void;
    mockOpen.mockImplementation(
      () => new Promise((resolve) => (finishOpen = () => resolve(fakeExpoDb()))),
    );
    const ctx = renderProvider(mod);
    const pending = ctx.current!.whenReady();

    await act(async () => finishOpen());
    const repository = await pending;
    const created = await repository.create(input, 1);
    expect(await repository.getById(created.id)).toEqual(created);
  });

  it('whenReady() rejects with StorageError("db_open") after the timeout', async () => {
    jest.useFakeTimers();
    try {
      mockOpen.mockImplementation(() => new Promise(() => {}));
      const ctx = renderProvider(mod);
      const pending = ctx.current!.whenReady(10_000);
      const assertion = expect(pending).rejects.toMatchObject({
        name: 'StorageError',
        code: 'db_open',
      });
      act(() => jest.advanceTimersByTime(10_000));
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('with EXPO_PUBLIC_DEV_TOOLS=1', () => {
  // The provider reads the variable when it opens, not at import time, so the same module works.
  // If babel ever inlined it at transform time, these tests would fail instead of passing silently.
  function loadWithDevTools() {
    process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
    return {
      provider: require('@/data/DatabaseProvider') as Loaded,
      flag: require('@/dev/storageErrorFlag') as typeof import('@/dev/storageErrorFlag'),
    };
  }

  it('throws StorageError("simulated") on every call while the flag is on', async () => {
    const { provider, flag } = loadWithDevTools();
    mockOpen.mockImplementation(async () => fakeExpoDb());
    const ctx = renderProvider(provider);
    await flush();

    const repo = await ctx.current!.whenReady();
    const created = await repo.create(input, 1);

    flag.setSimulateStorageError(true);
    const calls = [
      repo.listByMonth(sept),
      repo.listRange(sept, sept),
      repo.getById(created.id),
      repo.create(input, 2),
      repo.update(created.id, input),
      repo.remove(created.id),
    ];
    for (const call of calls) {
      await expect(call).rejects.toMatchObject({ name: 'StorageError', code: 'simulated' });
    }

    flag.setSimulateStorageError(false);
    expect(await repo.listByMonth(sept)).toEqual([created]);
  });

  it('exposes the raw database for the seed', async () => {
    const { provider } = loadWithDevTools();
    mockOpen.mockImplementation(async () => fakeExpoDb());
    const ctx = renderProvider(provider);
    await flush();
    expect(ctx.current?.db).toBeDefined();
  });
});
