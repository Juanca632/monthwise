import { openAndMigrate, SCHEMA_VERSION } from '@/data/migrations';

import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';
import { tempDbFile } from '../helpers/tempDbFile';

let temp: ReturnType<typeof tempDbFile>;
let db: TestDatabase;

beforeEach(async () => {
  temp = tempDbFile();
  db = openTestDatabase(temp.file);
  await openAndMigrate(db);
});

afterEach(() => {
  db.close();
  temp.cleanup();
});

const userVersion = async (d: TestDatabase) =>
  (await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;

const insert = (row: Partial<Record<string, string | number | null>>) => {
  const r = {
    type: 'expense',
    amount_cents: 1250,
    date: '2026-09-15',
    category: 'food',
    note: null,
    created_at: 1,
    ...row,
  };
  return db.runAsync(
    'INSERT INTO transactions (type, amount_cents, date, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    r.type,
    r.amount_cents,
    r.date,
    r.category,
    r.note,
    r.created_at,
  );
};

it('sets user_version to 1 on an empty database', async () => {
  expect(SCHEMA_VERSION).toBe(1);
  expect(await userVersion(db)).toBe(1);
});

it('uses WAL journal mode', async () => {
  const row = await db.getFirstAsync<{ journal_mode: string }>('PRAGMA journal_mode');
  expect(row?.journal_mode).toBe('wal');
});

it('does not run the migration again on the next open', async () => {
  await insert({});
  db.close();

  db = openTestDatabase(temp.file);
  // A second CREATE TABLE would throw, so a clean open proves it was skipped.
  await expect(openAndMigrate(db)).resolves.toBeUndefined();
  expect(await userVersion(db)).toBe(1);
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions');
  expect(count?.n).toBe(1);
});

it('creates the date index', async () => {
  const idx = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'transactions'",
  );
  expect(idx.map((i) => i.name)).toContain('idx_transactions_date');
});

it('accepts a valid row', async () => {
  await expect(insert({})).resolves.toMatchObject({ changes: 1 });
});

describe('CHECK constraints', () => {
  it.each([
    ['unknown type', { type: 'transfer' }],
    ['amount 0', { amount_cents: 0 }],
    ['negative amount', { amount_cents: -5 }],
    ['amount over the maximum', { amount_cents: 100000000 }],
    ['day that does not exist (2026-02-30)', { date: '2026-02-30' }],
    ['month 13 (2026-13-45)', { date: '2026-13-45' }],
    ['date before 2000', { date: '1999-12-31' }],
    ['date not in YYYY-MM-DD', { date: '2026-9-15' }],
    ['expense with an income category', { type: 'expense', category: 'salary' }],
    ['income with an expense category', { type: 'income', category: 'food' }],
    ['empty note', { note: '' }],
    ['missing created_at', { created_at: null }],
  ])('rejects %s and stores nothing', async (_name, row) => {
    await expect(insert(row)).rejects.toThrow();
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions');
    expect(count?.n).toBe(0);
  });

  it('accepts other for both types', async () => {
    await insert({ type: 'expense', category: 'other' });
    await insert({ type: 'income', category: 'other' });
  });
});
