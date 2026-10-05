import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  isCurrentMonth,
  isMinMonth,
  monthOf,
  next,
  previous,
  type IsoDate,
  type YearMonth,
} from '@/domain/month';
import { useToday } from '@/hooks/useToday';

export type SelectedMonthValue = {
  selected: YearMonth;
  today: IsoDate;
  setSelected(month: YearMonth): void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goPrevious(): void;
  goNext(): void;
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

  const value = useMemo<SelectedMonthValue>(() => {
    // FR-021: January 2000 is the first month and the current month the last.
    const canGoPrevious = !isMinMonth(selected);
    const canGoNext = !isCurrentMonth(selected, today);
    return {
      selected,
      today,
      setSelected,
      canGoPrevious,
      canGoNext,
      goPrevious: () => {
        if (canGoPrevious) setSelected(previous(selected));
      },
      goNext: () => {
        if (canGoNext) setSelected(next(selected));
      },
    };
  }, [selected, today]);

  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>;
}

export function useSelectedMonth(): SelectedMonthValue {
  const value = useContext(SelectedMonthContext);
  if (value === null) throw new Error('useSelectedMonth must be used inside SelectedMonthProvider');
  return value;
}
