import { openAndMigrate } from '@/data/migrations';
import type { SqlDatabase } from '@/data/sqlDatabase';
import { MAX_AMOUNT_CENTS } from '@/domain/amount';
import { isValidCategory, type TransactionType } from '@/domain/categories';
import { countGraphemes, NOTE_MAX_GRAPHEMES } from '@/domain/note';
import { SEED_COUNT, SEED_MONTHS, seedCurrentMonth, seedSevenMonths } from '@/dev/seed';

import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

type Row = { type: TransactionType; amount_cents: number; date: string; category: string; note: string | null };

let db: TestDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await openAndMigrate(db);
});

afterEach(() => db.close());

/** The checks every seeded row must pass: what the forms would accept. */
function expectValid(row: Row) {
  expect(['income', 'expense']).toContain(row.type);
  expect(isValidCategory(row.type, row.category)).toBe(true);
  expect(Number.isInteger(row.amount_cents)).toBe(true);
  expect(row.amount_cents).toBeGreaterThanOrEqual(1);
  expect(row.amount_cents).toBeLessThanOrEqual(MAX_AMOUNT_CENTS);
  expect(row.note === null || countGraphemes(row.note) <= NOTE_MAX_GRAPHEMES).toBe(true);
}

/** Row counts by `YYYY-MM`. */
function countByMonth(rows: Row[]) {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.date.slice(0, 7)] = (counts[r.date.slice(0, 7)] ?? 0) + 1;
  return counts;
}

/** A db whose 500th insert fails, to check the rollback. */
function failingAtInsert500(): SqlDatabase {
  let calls = 0;
  return {
    ...db,
    runAsync: (sql, ...params) => {
      calls += 1;
      if (calls === 500) return Promise.reject(new Error('disk full'));
      return db.runAsync(sql, ...params);
    },
  };
}

const allRows = () =>
  db.getAllAsync<Row>('SELECT type, amount_cents, date, category, note FROM transactions');

describe('seedCurrentMonth', () => {
  it('inserts 1,000 valid transactions dated from the 1st of the month to today', async () => {
    await seedCurrentMonth(db, '2026-10-15');

    const rows = await allRows();
    expect(rows).toHaveLength(SEED_COUNT);
    expect(SEED_COUNT).toBe(1000);
    for (const row of rows) {
      expect(row.date >= '2026-10-01' && row.date <= '2026-10-15').toBe(true);
      expectValid(row);
    }
  });

  it('uses both types and every day up to today', async () => {
    await seedCurrentMonth(db, '2026-10-15');

    const rows = await allRows();
    expect(new Set(rows.map((r) => r.type))).toEqual(new Set(['income', 'expense']));
    expect(new Set(rows.map((r) => r.date)).size).toBe(15);
  });

  it('dates every row today on the 1st of the month', async () => {
    await seedCurrentMonth(db, '2026-02-01');

    const dates = new Set((await allRows()).map((r) => r.date));
    expect(dates).toEqual(new Set(['2026-02-01']));
  });

  it('keeps dates within the month at the largest random value', async () => {
    // Math.random() is < 1, so the largest value it can return must still pick today.
    await seedCurrentMonth(db, '2026-10-15', () => 0.999999);

    const rows = await allRows();
    expect(rows.every((r) => r.date === '2026-10-15')).toBe(true);
  });

  it('writes all rows or none: a failure rolls the whole seed back', async () => {
    await expect(seedCurrentMonth(failingAtInsert500(), '2026-10-15')).rejects.toThrow();
    expect(await allRows()).toEqual([]);
  });
});

describe('seedSevenMonths (SC-002)', () => {
  it('inserts 1,000 valid transactions in today\'s month up to today and in each of the six before', async () => {
    await seedSevenMonths(db, '2026-10-15');

    const rows = await allRows();
    expect(SEED_MONTHS).toBe(7);
    expect(countByMonth(rows)).toEqual({
      '2026-04': 1000,
      '2026-05': 1000,
      '2026-06': 1000,
      '2026-07': 1000,
      '2026-08': 1000,
      '2026-09': 1000,
      '2026-10': 1000,
    });
    for (const row of rows) {
      expect(row.date >= '2026-04-01' && row.date <= '2026-10-15').toBe(true);
      expectValid(row);
    }
  });

  it('fills every day of the past months, up to their last day, across a year boundary', async () => {
    await seedSevenMonths(db, '2027-01-03');

    const rows = await allRows();
    const days = (prefix: string) => new Set(rows.filter((r) => r.date.startsWith(prefix)).map((r) => r.date));
    expect(Object.keys(countByMonth(rows)).sort()).toEqual([
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
    ]);
    expect(days('2027-01').size).toBe(3);
    expect(days('2026-11').size).toBe(30);
    expect(days('2026-12').size).toBe(31);
  });

  it('keeps every date within its month at the largest random value', async () => {
    await seedSevenMonths(db, '2026-03-15', () => 0.999999);

    const dates = new Set((await allRows()).map((r) => r.date));
    expect(dates).toEqual(
      new Set(['2025-09-30', '2025-10-31', '2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-15']),
    );
  });

  it('skips the months before January 2000, which the app never shows', async () => {
    await seedSevenMonths(db, '2000-02-10');

    expect(countByMonth(await allRows())).toEqual({ '2000-01': 1000, '2000-02': 1000 });
  });

  it('writes all rows or none: a failure rolls the whole seed back', async () => {
    await expect(seedSevenMonths(failingAtInsert500(), '2026-10-15')).rejects.toThrow();
    expect(await allRows()).toEqual([]);
  });
});
