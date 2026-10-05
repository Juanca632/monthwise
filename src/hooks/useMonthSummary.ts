import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import type { Transaction } from '@/data/transactionRepository';
import type { YearMonth } from '@/domain/month';
import { computeSummary, type Summary } from '@/domain/summary';
import { logTiming } from '@/lib/devLog';
import { reportError } from '@/lib/reportError';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

export type MonthSummaryStatus = 'loading' | 'error' | 'ready';

export type MonthSummary = {
  status: MonthSummaryStatus;
  /** Rows of the month on screen; empty unless `status` is `'ready'`. */
  rows: readonly Transaction[];
  summary: Summary;
  retry(): void;
};

const keyOf = (m: YearMonth) => `${m.year}-${m.month}`;
const NO_ROWS: readonly Transaction[] = [];

// Once per app run: SC-004 is about the cold start, not later reloads.
let firstQueryLogged = false;

/**
 * Loads the month on screen: when the database becomes ready, when the month changes and every
 * time the screen gets focus (FR-019), so closing a form shows its change.
 */
export function useMonthSummary(): MonthSummary {
  const db = useDatabase();
  const { selected } = useSelectedMonth();
  const key = keyOf(selected);

  // Rows are stored with their month, so data for another month never counts as "this month's".
  const [data, setData] = useState<{ key: string; rows: Transaction[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  // Only the newest query may write its result: an older one for the same or another month
  // could otherwise land last and overwrite it.
  const latest = useRef(0);

  const repository = db.repository;
  const load = useCallback(() => {
    if (!repository) return;
    const id = ++latest.current;
    const start = performance.now();
    repository.listByMonth(selected).then(
      (rows) => {
        if (id !== latest.current) return;
        if (!firstQueryLogged) {
          firstQueryLogged = true;
          logTiming('first-query', performance.now() - start);
        }
        setData({ key: keyOf(selected), rows });
        setFailedKey(null);
      },
      (e: unknown) => {
        if (id !== latest.current) return;
        reportError(e instanceof StorageError ? e.code : 'list');
        setFailedKey(keyOf(selected));
      },
    );
  }, [repository, selected]);

  // Re-runs on focus and whenever `load` changes (database ready, month changed).
  useFocusEffect(load);

  const retry = useCallback(() => {
    // A retry starts from scratch, so it shows the loading state (contracts/ui-screens.md).
    setData(null);
    setFailedKey(null);
    if (db.status === 'error') db.retry();
    else load();
  }, [db, load]);

  // A same-month reload keeps the current rows on screen; loading shows only when there is
  // nothing for this month yet. A failed reload still shows the error.
  let status: MonthSummaryStatus;
  if (db.status === 'error' || failedKey === key) status = 'error';
  else if (data?.key === key) status = 'ready';
  else status = 'loading';

  const rows = status === 'ready' && data ? data.rows : NO_ROWS;
  const summary = useMemo(() => computeSummary(rows), [rows]);

  return { status, rows, summary, retry };
}
