import {
  MIN_MONTH,
  addMonths,
  compareMonths,
  daysInMonth,
  defaultFormDate,
  isCurrentMonth,
  isMinMonth,
  lastDayOf,
  monthOf,
  monthRange,
  next,
  pickerYear,
  previous,
  toIsoDate,
} from '@/domain/month';

describe('month', () => {
  it('monthOf extracts year and month', () => {
    expect(monthOf('2026-09-15')).toEqual({ year: 2026, month: 9 });
  });

  it('lastDayOf handles leap and non-leap February', () => {
    expect(lastDayOf({ year: 2024, month: 2 })).toBe('2024-02-29');
    expect(lastDayOf({ year: 2026, month: 2 })).toBe('2026-02-28');
    expect(lastDayOf({ year: 2000, month: 2 })).toBe('2000-02-29');
    expect(lastDayOf({ year: 2100, month: 2 })).toBe('2100-02-28');
    expect(lastDayOf({ year: 2026, month: 4 })).toBe('2026-04-30');
    expect(lastDayOf({ year: 2026, month: 12 })).toBe('2026-12-31');
  });

  it('previous and next cross year boundaries', () => {
    expect(next({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
    expect(previous({ year: 2027, month: 1 })).toEqual({ year: 2026, month: 12 });
    expect(next({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 6 });
    expect(previous({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 4 });
  });

  it('handles the January 2000 limit', () => {
    expect(isMinMonth(MIN_MONTH)).toBe(true);
    expect(isMinMonth({ year: 2000, month: 2 })).toBe(false);
    expect(isMinMonth({ year: 2001, month: 1 })).toBe(false);
    expect(previous({ year: 2000, month: 2 })).toEqual(MIN_MONTH);
  });

  it('monthRange is a half-open range', () => {
    expect(monthRange({ year: 2026, month: 9 })).toEqual(['2026-09-01', '2026-10-01']);
    expect(monthRange({ year: 2026, month: 12 })).toEqual(['2026-12-01', '2027-01-01']);
  });

  it('isCurrentMonth compares year and month', () => {
    expect(isCurrentMonth({ year: 2026, month: 10 }, '2026-10-05')).toBe(true);
    expect(isCurrentMonth({ year: 2025, month: 10 }, '2026-10-05')).toBe(false);
    expect(isCurrentMonth({ year: 2026, month: 9 }, '2026-10-05')).toBe(false);
  });

  it('defaultFormDate follows FR-003', () => {
    expect(defaultFormDate({ year: 2026, month: 10 }, '2026-10-05')).toBe('2026-10-05');
    expect(defaultFormDate({ year: 2026, month: 2 }, '2026-10-05')).toBe('2026-02-28');
    expect(defaultFormDate({ year: 2024, month: 2 }, '2026-10-05')).toBe('2024-02-29');
  });

  it('toIsoDate uses local time and zero-pads', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31');
  });
});

describe('month arithmetic (002)', () => {
  const ym = (year: number, month: number) => ({ year, month });

  it('addMonths moves by ±1 across a year end', () => {
    expect(addMonths(ym(2026, 12), 1)).toEqual(ym(2027, 1));
    expect(addMonths(ym(2027, 1), -1)).toEqual(ym(2026, 12));
    expect(addMonths(ym(2026, 5), 1)).toEqual(ym(2026, 6));
    expect(addMonths(ym(2026, 5), 0)).toEqual(ym(2026, 5));
  });

  it('addMonths moves by ±12 to the same month of another year', () => {
    expect(addMonths(ym(2026, 3), 12)).toEqual(ym(2027, 3));
    expect(addMonths(ym(2026, 3), -12)).toEqual(ym(2025, 3));
    expect(addMonths(ym(2026, 12), -12)).toEqual(ym(2025, 12));
  });

  it('addMonths moves by ±25 across two year ends', () => {
    expect(addMonths(ym(2026, 11), 25)).toEqual(ym(2028, 12));
    expect(addMonths(ym(2026, 12), 25)).toEqual(ym(2029, 1));
    expect(addMonths(ym(2026, 1), -25)).toEqual(ym(2023, 12));
    expect(addMonths(ym(2026, 2), -25)).toEqual(ym(2024, 1));
    // The trend's start: five months before January 2001 is August 2000.
    expect(addMonths(ym(2001, 1), -5)).toEqual(ym(2000, 8));
  });

  it('daysInMonth follows the leap-year rule', () => {
    expect(daysInMonth(ym(2000, 2))).toBe(29);
    expect(daysInMonth(ym(2100, 2))).toBe(28);
    expect(daysInMonth(ym(2024, 2))).toBe(29);
    expect(daysInMonth(ym(2026, 2))).toBe(28);
    expect(daysInMonth(ym(2026, 9))).toBe(30);
    expect(daysInMonth(ym(2026, 10))).toBe(31);
    expect(daysInMonth(ym(2026, 12))).toBe(31);
  });

  it('compareMonths orders earlier, equal and later months', () => {
    expect(compareMonths(ym(2026, 9), ym(2026, 9))).toBe(0);
    expect(compareMonths(ym(2026, 8), ym(2026, 9))).toBeLessThan(0);
    expect(compareMonths(ym(2026, 10), ym(2026, 9))).toBeGreaterThan(0);
    expect(compareMonths(ym(2025, 12), ym(2026, 1))).toBeLessThan(0);
    expect(compareMonths(ym(2027, 1), ym(2026, 12))).toBeGreaterThan(0);
  });
});

describe('pickerYear (FR-027)', () => {
  const ym = (year: number, month: number) => ({ year, month });
  const flags = (p: ReturnType<typeof pickerYear>, key: 'selected' | 'available') =>
    p.months.map((m) => m[key]);

  it('the current year: months after the current one are unavailable, no next year', () => {
    const p = pickerYear(2026, ym(2026, 10), '2026-10-12');
    expect(p.months.map((m) => m.month)).toEqual(Array.from({ length: 12 }, (_, i) => ym(2026, i + 1)));
    expect(flags(p, 'available')).toEqual([...Array(10).fill(true), false, false]);
    expect(flags(p, 'selected').indexOf(true)).toBe(9);
    expect(p).toMatchObject({ year: 2026, canGoPrevious: true, canGoNext: false });
  });

  it('2000: no previous year', () => {
    const p = pickerYear(2000, ym(2026, 10), '2026-10-12');
    expect(p).toMatchObject({ canGoPrevious: false, canGoNext: true });
    expect(flags(p, 'available').every(Boolean)).toBe(true);
    expect(flags(p, 'selected').some(Boolean)).toBe(false);
  });

  it('a past year: every month available, both directions open', () => {
    const p = pickerYear(2024, ym(2024, 3), '2026-10-12');
    expect(p).toMatchObject({ canGoPrevious: true, canGoNext: true });
    expect(flags(p, 'available').every(Boolean)).toBe(true);
    expect(flags(p, 'selected').indexOf(true)).toBe(2);
  });

  it('today in January: only January of the current year is available', () => {
    const p = pickerYear(2027, ym(2027, 1), '2027-01-05');
    expect(flags(p, 'available')).toEqual([true, ...Array(11).fill(false)]);
    expect(p).toMatchObject({ canGoPrevious: true, canGoNext: false });
  });

  it('today in 2000: neither direction is open', () => {
    const p = pickerYear(2000, ym(2000, 1), '2000-03-10');
    expect(p).toMatchObject({ canGoPrevious: false, canGoNext: false });
    expect(flags(p, 'available')).toEqual([true, true, true, ...Array(9).fill(false)]);
  });

  it('a selected month in another year marks nothing in the shown year', () => {
    expect(flags(pickerYear(2025, ym(2026, 10), '2026-10-12'), 'selected').some(Boolean)).toBe(false);
  });
});
