import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import { rowsInMonth, type LedgerRow } from '@/domain/ledger';
import { addMonths, compareMonths, MIN_MONTH, previous, type YearMonth } from '@/domain/month';
import { compareCategories, type CategoryComparison } from '@/domain/categoryChanges';
import { computePace, type Pace } from '@/domain/pace';
import { reportError } from '@/lib/reportError';
import { dropPace, takePace } from '@/state/handedPace';
import { useSelectedMonth } from '@/state/SelectedMonthContext';

export type InsightsStatus = 'loading' | 'error' | 'ready';

export type Insights = {
  status: InsightsStatus;
  /** The six months' rows up to the selected month; empty unless `status` is `'ready'`. */
  rows: readonly LedgerRow[];
  /** From the read when ready; until then the pace the summary card handed over, if any. */
  pace: Pace | null;
  /** `null` until the read answers. */
  categories: CategoryComparison | null;
  retry(): void;
};

/** The first month of the savings trend. T039 replaces this with the domain's `trendStart`. */
function trendStart(selected: YearMonth): YearMonth {
  const start = addMonths(selected, -5);
  return compareMonths(start, MIN_MONTH) < 0 ? MIN_MONTH : start;
}

const keyOf = (m: YearMonth) => `${m.year}-${m.month}`;
const NO_ROWS: readonly LedgerRow[] = [];

const sameLedger = (a: readonly LedgerRow[], b: readonly LedgerRow[]) =>
  a.length === b.length &&
  a.every((r, i) => {
    const o = b[i];
    return r.type === o.type && r.amountCents === o.amountCents && r.date === o.date && r.category === o.category;
  });

type RangeData = { key: string; rows: LedgerRow[] };

/**
 * Loads Insights for the selected month (research R3): one range read that starts once the push
 * transition has ended (constitution V), then again on focus (FR-018), on a month change and on
 * `retry`. Only the newest read writes its result, and a same-month reload keeps what is on
 * screen, as `useMonthSummary` does.
 */
export function useInsights(): Insights {
  const db = useDatabase();
  const navigation = useNavigation();
  const { selected, today } = useSelectedMonth();
  const key = keyOf(selected);

  // No read while the screen slides in: its first frame shows the handed pace instead.
  const [transitioned, setTransitioned] = useState(false);
  useEffect(
    () => navigation.addListener('transitionEnd' as never, () => setTransitioned(true)),
    [navigation],
  );

  const [data, setData] = useState<RangeData | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const latest = useRef(0);

  // The handed pace belongs to the month the card showed; another month loads its own.
  const opened = useRef(selected);
  useEffect(() => {
    if (opened.current !== selected) dropPace();
  }, [selected]);

  const repository = db.repository;
  const load = useCallback(() => {
    if (!repository || !transitioned) return;
    const id = ++latest.current;
    const nextKey = keyOf(selected);
    repository.listRange(trendStart(selected), selected).then(
      (rows) => {
        if (id !== latest.current) return;
        setData((prev) => (prev?.key === nextKey && sameLedger(prev.rows, rows) ? prev : { key: nextKey, rows }));
        setFailedKey(null);
      },
      (e: unknown) => {
        if (id !== latest.current) return;
        reportError(e instanceof StorageError ? e.code : 'list');
        setFailedKey(nextKey);
      },
    );
  }, [repository, selected, transitioned]);

  // Re-runs on focus and whenever `load` changes (transition ended, database ready, month changed).
  useFocusEffect(load);

  const retry = useCallback(() => {
    // A retry starts from scratch, so it shows the loading state (contracts/ui-screens.md).
    setData(null);
    setFailedKey(null);
    if (db.status === 'error') db.retry();
    else load();
  }, [db, load]);

  let status: InsightsStatus;
  if (db.status === 'error' || failedKey === key) status = 'error';
  else if (data?.key === key) status = 'ready';
  else status = 'loading';

  const ready = status === 'ready' && data !== null;
  const rows = ready ? data.rows : NO_ROWS;
  // `today` is a dependency so a new day moves the comparison day on the next focus.
  const months = useMemo(
    () => (ready ? { current: rowsInMonth(rows, selected), previous: rowsInMonth(rows, previous(selected)) } : null),
    [ready, rows, selected],
  );
  const readPace = useMemo(
    () => (months ? computePace(selected, months.current, months.previous, today) : null),
    [months, selected, today],
  );
  const categories = useMemo(
    () => (months ? compareCategories(selected, months.current, months.previous, today) : null),
    [months, selected, today],
  );
  const pace = readPace ?? (status === 'loading' ? (takePace(selected)?.pace ?? null) : null);

  return { status, rows, pace, categories, retry };
}
