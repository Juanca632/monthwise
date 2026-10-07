import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useSelectedMonth } from './SelectedMonthContext';

/** The only summary banner in the contract: "Couldn't open this transaction." (FR-025). */
export type SummaryNotice = 'open_failed';

/**
 * The last successful save or delete, so the summary animates that one row (design.md, Motion,
 * "Saved" and "Deleted"). A new object each time, so the same row changed twice counts twice.
 */
export type LastChange = { kind: 'created' | 'updated' | 'deleted'; id: number };

export type SummaryNoticeValue = {
  notice: SummaryNotice | null;
  show(notice: SummaryNotice): void;
  dismiss(): void;
  lastChange: LastChange | null;
  recordChange(change: LastChange): void;
};

const SummaryNoticeContext = createContext<SummaryNoticeValue | null>(null);

/** Must sit inside `SelectedMonthProvider`. */
export function SummaryNoticeProvider({ children }: { children: ReactNode }) {
  const { selected } = useSelectedMonth();
  // The banner is about the month it appeared on, so it is stored with that month and hidden as
  // soon as the month differs, whatever changed it: navigation, a save (FR-020) or the foreground
  // rollover. This is the only place that rule lives. Compared by value, so a new object for the
  // same month keeps the banner.
  const monthKey = `${selected.year}-${selected.month}`;
  const [stored, setStored] = useState<{ monthKey: string; notice: SummaryNotice } | null>(null);
  const notice = stored?.monthKey === monthKey ? stored.notice : null;
  const [lastChange, setLastChange] = useState<LastChange | null>(null);

  const value = useMemo<SummaryNoticeValue>(
    () => ({
      notice,
      show: (next) => setStored({ monthKey, notice: next }),
      dismiss: () => setStored(null),
      lastChange,
      recordChange: (change) => setLastChange({ ...change }),
    }),
    [notice, monthKey, lastChange],
  );

  return <SummaryNoticeContext.Provider value={value}>{children}</SummaryNoticeContext.Provider>;
}

export function useSummaryNotice(): SummaryNoticeValue {
  const value = useContext(SummaryNoticeContext);
  if (value === null) throw new Error('useSummaryNotice must be used inside SummaryNoticeProvider');
  return value;
}
