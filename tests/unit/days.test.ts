import { groupByDay, type DayRow } from '@/domain/days';
import { dayName, spokenDayName } from '@/format/date';

const row = (date: string, type: DayRow['type'], amountCents: number) => ({ date, type, amountCents });

describe('groupByDay (FR-017)', () => {
  it('keeps the given order and groups rows of the same date', () => {
    const rows = [
      row('2026-10-15', 'expense', 1250),
      row('2026-10-15', 'income', 200000),
      row('2026-10-14', 'expense', 999),
      row('2026-10-02', 'expense', 1),
    ];
    const groups = groupByDay(rows);
    expect(groups.map((g) => g.date)).toEqual(['2026-10-15', '2026-10-14', '2026-10-02']);
    expect(groups[0].rows).toEqual([rows[0], rows[1]]);
  });

  it('nets each day in whole cents: income minus expenses', () => {
    const groups = groupByDay([
      row('2026-10-15', 'expense', 1250),
      row('2026-10-15', 'income', 200000),
      row('2026-10-14', 'expense', 999),
      row('2026-10-13', 'income', 500),
      row('2026-10-13', 'expense', 500),
    ]);
    expect(groups.map((g) => g.netCents)).toEqual([198750, -999, 0]);
    expect(groups.every((g) => Number.isInteger(g.netCents))).toBe(true);
  });

  it('gives no groups for no rows', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('day names (FR-017, FR-029)', () => {
  const today = '2026-10-15';

  it.each([
    ['2026-10-15', 'Today', 'Today'],
    ['2026-10-14', 'Yesterday', 'Yesterday'],
    ['2026-10-05', 'Mon 5 Oct', 'Monday 5 October'],
    ['2026-09-30', 'Wed 30 Sep', 'Wednesday 30 September'],
  ])('%s → "%s" / "%s"', (date, shown, spoken) => {
    expect(dayName(date, today)).toBe(shown);
    expect(spokenDayName(date, today)).toBe(spoken);
  });

  it('names yesterday across a month boundary, from the actual date', () => {
    // Viewing September on 1 October: the 30th is still "Yesterday".
    expect(dayName('2026-09-30', '2026-10-01')).toBe('Yesterday');
    expect(dayName('2025-12-31', '2026-01-01')).toBe('Yesterday');
  });

  it('never calls a future date "Today"', () => {
    expect(dayName('2026-10-16', today)).toBe('Fri 16 Oct');
  });
});
