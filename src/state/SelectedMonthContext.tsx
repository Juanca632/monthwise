import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { monthOf, type IsoDate, type YearMonth } from '@/domain/month';
import { useToday } from '@/hooks/useToday';

export type SelectedMonthValue = {
  selected: YearMonth;
  today: IsoDate;
  /** The month picker only offers January 2000 to the current month (002 FR-027). */
  setSelected(month: YearMonth): void;
};

const SelectedMonthContext = createContext<SelectedMonthValue | null>(null);

const sameMonth = (a: YearMonth, b: YearMonth) => a.year === b.year && a.month === b.month;

export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  // FR-014: the summary opens on the current month.
  const [selected, setSelected] = useState<YearMonth>(() => monthOf(today));
  const previousToday = useRef(today);

  useEffect(() => {
    const oldMonth = monthOf(previousToday.current);
    previousToday.current = today;
    const newMonth = monthOf(today);
    // Someone looking at "this month" keeps seeing this month after a rollover; a past month
    // they chose stays put.
    if (!sameMonth(oldMonth, newMonth)) {
      setSelected((current) => (sameMonth(current, oldMonth) ? newMonth : current));
    }
  }, [today]);

  const value = useMemo<SelectedMonthValue>(
    () => ({
      selected,
      today,
      // The same month keeps the same object: a save in the month on screen must not look like a
      // month change, which reloaded the summary a second time after every save.
      setSelected: (month) => setSelected((current) => (sameMonth(current, month) ? current : month)),
    }),
    [selected, today],
  );

  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>;
}

export function useSelectedMonth(): SelectedMonthValue {
  const value = useContext(SelectedMonthContext);
  if (value === null) throw new Error('useSelectedMonth must be used inside SelectedMonthProvider');
  return value;
}
