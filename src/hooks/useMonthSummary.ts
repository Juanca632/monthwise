import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import type { Transaction } from '@/data/transactionRepository';
import type { LedgerRow } from '@/domain/ledger';
import { isMinMonth, previous, type YearMonth } from '@/domain/month';
import { computePace, type Pace } from '@/domain/pace';
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
  /** The Spending pace card's data (002); `null` unless `status` is `'ready'`. */
  pace: Pace | null;
  retry(): void;
};

const keyOf = (m: YearMonth) => `${m.year}-${m.month}`;
const NO_ROWS: readonly Transaction[] = [];
const NO_LEDGER: readonly LedgerRow[] = [];

const sameRows = (a: readonly Transaction[], b: readonly Transaction[]) =>
  a.length === b.length &&
  a.every((r, i) => {
    const o = b[i];
    return (
      r.id === o.id &&
      r.type === o.type &&
      r.amountCents === o.amountCents &&
      r.date === o.date &&
      r.category === o.category &&
      r.note === o.note &&
      r.createdAt === o.createdAt
    );
  });

const sameLedger = (a: readonly LedgerRow[], b: readonly LedgerRow[]) =>
  a.length === b.length &&
  a.every((r, i) => {
    const o = b[i];
    return (
      r.type === o.type &&
      r.amountCents === o.amountCents &&
      r.date === o.date &&
      r.category === o.category
    );
  });

type MonthData = { key: string; rows: Transaction[]; previousRows: LedgerRow[] };

// Once per app run: SC-004 is about the cold start, not later reloads.
let firstQueryLogged = false;

/**
 * Loads the month on screen: when the database becomes ready, when the month changes and every
 * time the screen gets focus (FR-019), so closing a form shows its change. Not while the form's
 * sheet slides down: reloading then kept the JS thread busy, so the sheet's screen left late and
 * blocked scrolling, and the row's animation played hidden under the sheet (fine-tuning
 * 2026-10-07).
 */
export function useMonthSummary(): MonthSummary {
  const db = useDatabase();
  const { selected, today } = useSelectedMonth();
  const key = keyOf(selected);

  // Rows are stored with their month, so data for another month never counts as "this month's".
  // The previous month's rows (for the pace card) live under the same key, so the card never mixes
  // two loads (research R3).
  const [data, setData] = useState<MonthData | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  // Only the newest query may write its result: an older one for the same or another month
  // could otherwise land last and overwrite it.
  const latest = useRef(0);

  const repository = db.repository;
  const load = useCallback(() => {
    if (!repository) return;
    const id = ++latest.current;
    const start = performance.now();
    const before = previous(selected);
    // One state for both reads: the card is ready, or failed, together with the summary. Nothing
    // can be dated before January 2000, so that month skips the second read.
    Promise.all([
      repository.listByMonth(selected),
      isMinMonth(selected) ? Promise.resolve([]) : repository.listRange(before, before),
    ]).then(
      ([rows, previousRows]) => {
        if (id !== latest.current) return;
        if (!firstQueryLogged) {
          firstQueryLogged = true;
          logTiming('first-query', performance.now() - start);
        }
        const nextKey = keyOf(selected);
        // Focus reloads mostly bring back the same rows (e.g. leaving See all): keeping the old
        // state lets React skip a full summary render in the middle of the back animation.
        setData((prev) =>
          prev?.key === nextKey &&
          sameRows(prev.rows, rows) &&
          sameLedger(prev.previousRows, previousRows)
            ? prev
            : { key: nextKey, rows, previousRows },
        );
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

  const ready = status === 'ready' && data !== null;
  const rows = ready ? data.rows : NO_ROWS;
  const previousRows = ready ? data.previousRows : NO_LEDGER;
  const summary = useMemo(() => computeSummary(rows), [rows]);
  // `today` is a dependency so a new day (foreground, midnight) moves the comparison day.
  const pace = useMemo(
    () => (ready ? computePace(selected, rows, previousRows, today) : null),
    [ready, selected, rows, previousRows, today],
  );

  return { status, rows, summary, pace, retry };
}
