import { openAndMigrate } from '@/data/migrations';
import type { SqlDatabase } from '@/data/sqlDatabase';
import { MAX_AMOUNT_CENTS } from '@/domain/amount';
import { isValidCategory, type TransactionType } from '@/domain/categories';
import { countGraphemes, NOTE_MAX_GRAPHEMES } from '@/domain/note';
import { SEED_COUNT, seedCurrentMonth } from '@/dev/seed';

import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

type Row = { type: TransactionType; amount_cents: number; date: string; category: string; note: string | null };

let db: TestDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await openAndMigrate(db);
});

afterEach(() => db.close());

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
      expect(['income', 'expense']).toContain(row.type);
      expect(isValidCategory(row.type, row.category)).toBe(true);
      expect(Number.isInteger(row.amount_cents)).toBe(true);
      expect(row.amount_cents).toBeGreaterThanOrEqual(1);
      expect(row.amount_cents).toBeLessThanOrEqual(MAX_AMOUNT_CENTS);
      expect(row.note === null || countGraphemes(row.note) <= NOTE_MAX_GRAPHEMES).toBe(true);
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
    let calls = 0;
    const failing: SqlDatabase = {
      ...db,
      runAsync: (sql, ...params) => {
        calls += 1;
        if (calls === 500) return Promise.reject(new Error('disk full'));
        return db.runAsync(sql, ...params);
      },
    };

    await expect(seedCurrentMonth(failing, '2026-10-15')).rejects.toThrow();
    expect(await allRows()).toEqual([]);
  });
});
