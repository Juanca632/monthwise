import { openDatabaseAsync } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { logTiming } from '@/lib/devLog';
import { reportError } from '@/lib/reportError';

import { StorageError } from './errors';
import { openAndMigrate } from './migrations';
import type { SqlDatabase } from './sqlDatabase';
import { createTransactionRepository, type TransactionRepository } from './transactionRepository';

export type DatabaseStatus = 'loading' | 'error' | 'ready';

export type DatabaseContextValue = {
  status: DatabaseStatus;
  /** Set only when `status` is `'ready'`; for reads during render. */
  repository: TransactionRepository | null;
  /** Opens the database again after a failure; does nothing while loading or ready. */
  retry(): void;
  /**
   * Resolves with the repository once the database is open. Writes use this value, never a
   * repository captured at render time, so a save started while opening still lands.
   */
  whenReady(timeoutMs?: number): Promise<TransactionRepository>;
  /** Raw database for the preview-only seed; undefined outside dev-tools builds. */
  db?: SqlDatabase;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

type Opened = { repository: TransactionRepository; db: SqlDatabase };

async function openOnce(): Promise<Opened> {
  const start = performance.now();
  const db = await openDatabaseAsync('monthwise.db');
  try {
    await openAndMigrate(db);
  } catch (e) {
    // Release the file so a retry starts clean.
    await db.closeAsync().catch(() => {});
    throw e;
  }
  logTiming('db-open', performance.now() - start);

  let repository = createTransactionRepository(db);

  // Expo inlines EXPO_PUBLIC_* at build time, so production bundles drop this whole branch,
  // including the flag module.
  if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1') {
    // A static import would keep the module in production bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const flag: typeof import('@/dev/storageErrorFlag') = require('@/dev/storageErrorFlag');
    const real = repository;
    const failIfSimulating = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      (...args: A): Promise<R> =>
        flag.isSimulatingStorageError() ? Promise.reject(new StorageError('simulated')) : fn(...args);
    repository = {
      listByMonth: failIfSimulating(real.listByMonth),
      getById: failIfSimulating(real.getById),
      create: failIfSimulating(real.create),
      update: failIfSimulating(real.update),
      remove: failIfSimulating(real.remove),
    };
  }

  return { repository, db };
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatabaseStatus>('loading');
  const [opened, setOpened] = useState<Opened | null>(null);
  // The current attempt, shared by every whenReady() call made while it runs.
  const attempt = useRef<Promise<Opened> | null>(null);

  const open = useCallback(() => {
    setStatus('loading');
    const current = openOnce();
    attempt.current = current;
    current.then(
      (result) => {
        if (attempt.current !== current) return;
        setOpened(result);
        setStatus('ready');
      },
      () => {
        if (attempt.current !== current) return;
        reportError('db_open');
        setStatus('error');
      },
    );
  }, []);

  useEffect(() => {
    // StrictMode runs effects twice in development; one database connection is enough.
    if (attempt.current === null) open();
  }, [open]);

  const retry = useCallback(() => {
    if (status === 'error') open();
  }, [open, status]);

  const whenReady = useCallback((timeoutMs = 10_000) => {
    const current = attempt.current;
    if (current === null) return Promise.reject(new StorageError('db_open'));
    return new Promise<TransactionRepository>((resolve, reject) => {
      const timer = setTimeout(() => reject(new StorageError('db_open')), timeoutMs);
      current.then(
        (result) => {
          clearTimeout(timer);
          resolve(result.repository);
        },
        () => {
          clearTimeout(timer);
          reject(new StorageError('db_open'));
        },
      );
    });
  }, []);

  const value = useMemo<DatabaseContextValue>(() => {
    const base: DatabaseContextValue = {
      status,
      repository: status === 'ready' ? (opened?.repository ?? null) : null,
      retry,
      whenReady,
    };
    if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1' && opened) base.db = opened.db;
    return base;
  }, [status, opened, retry, whenReady]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseContextValue {
  const value = useContext(DatabaseContext);
  if (value === null) throw new Error('useDatabase must be used inside DatabaseProvider');
  return value;
}
