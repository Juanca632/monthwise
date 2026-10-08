import {
  MIN_MONTH,
  defaultFormDate,
  isCurrentMonth,
  isMinMonth,
  lastDayOf,
  monthOf,
  monthRange,
  next,
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
