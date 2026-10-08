import { NotFoundError, StorageError } from '@/data/errors';
import { openAndMigrate } from '@/data/migrations';
import {
  createTransactionRepository,
  type TransactionRepository,
} from '@/data/transactionRepository';
import { computeSummary } from '@/domain/summary';
import type { TransactionInput } from '@/domain/validation';

import { referenceSummary, referenceTransactions } from '../fixtures/referenceTransactions';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';
import { tempDbFile } from '../helpers/tempDbFile';

let temp: ReturnType<typeof tempDbFile>;
let db: TestDatabase;
let repo: TransactionRepository;

beforeEach(async () => {
  temp = tempDbFile();
  db = openTestDatabase(temp.file);
  await openAndMigrate(db);
  repo = createTransactionRepository(db);
});

afterEach(() => {
  db.close();
  temp.cleanup();
});

const input = (over: Partial<TransactionInput> = {}): TransactionInput => ({
  type: 'expense',
  amountCents: 1250,
  date: '2026-09-15',
  category: 'food',
  note: null,
  ...over,
});

const count = async () =>
  (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))?.n;

describe('round trip', () => {
  it('returns the same row from create, getById and listByMonth', async () => {
    const created = await repo.create(input({ note: 'Lunch café ☕' }), 1_700_000_000_000);
    expect(created).toEqual({
      id: expect.any(Number),
      type: 'expense',
      amountCents: 1250,
      date: '2026-09-15',
      category: 'food',
      note: 'Lunch café ☕',
      createdAt: 1_700_000_000_000,
    });
    expect(await repo.getById(created.id)).toEqual(created);
    expect(await repo.listByMonth({ year: 2026, month: 9 })).toEqual([created]);
  });

  it('getById returns null for an unknown id', async () => {
    expect(await repo.getById(999)).toBeNull();
  });
});

describe('month boundaries', () => {
  it.each([
    ['September 2026', { year: 2026, month: 9 }, '2026-09-01', '2026-09-30', '2026-10-01'],
    ['February, leap year', { year: 2024, month: 2 }, '2024-02-01', '2024-02-29', '2024-03-01'],
    ['February, non-leap year', { year: 2026, month: 2 }, '2026-02-01', '2026-02-28', '2026-03-01'],
    ['December → January', { year: 2025, month: 12 }, '2025-12-01', '2025-12-31', '2026-01-01'],
  ])('%s holds its 1st and last day, not the next 1st', async (_n, month, first, last, nextFirst) => {
    const a = await repo.create(input({ date: first }), 1);
    const b = await repo.create(input({ date: last }), 2);
    await repo.create(input({ date: nextFirst }), 3);

    const ids = (await repo.listByMonth(month)).map((t) => t.id);
    expect(ids).toEqual([b.id, a.id]);
  });
});

describe('ordering', () => {
  it('orders by date descending, then the later save first', async () => {
    const older = await repo.create(input({ date: '2026-09-10' }), 5_000);
    // Saved later but with an older created_at, as after the phone's clock moved back.
    const later = await repo.create(input({ date: '2026-09-10' }), 1_000);
    const newest = await repo.create(input({ date: '2026-09-20' }), 3_000);

    const ids = (await repo.listByMonth({ year: 2026, month: 9 })).map((t) => t.id);
    expect(ids).toEqual([newest.id, later.id, older.id]);
  });
});

describe('update', () => {
  it('replaces the editable fields and keeps created_at', async () => {
    const created = await repo.create(input(), 42);
    const updated = await repo.update(
      created.id,
      input({ type: 'income', amountCents: 9999, category: 'salary', note: 'Bonus' }),
    );
    expect(updated).toEqual({
      ...created,
      type: 'income',
      amountCents: 9999,
      category: 'salary',
      note: 'Bonus',
    });
    expect(await repo.getById(created.id)).toEqual(updated);
  });

  it('moves the row to another month when the date changes', async () => {
    const created = await repo.create(input({ date: '2026-09-30' }), 1);
    await repo.update(created.id, input({ date: '2026-08-31' }));
    expect(await repo.listByMonth({ year: 2026, month: 9 })).toEqual([]);
    expect((await repo.listByMonth({ year: 2026, month: 8 })).map((t) => t.id)).toEqual([created.id]);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(repo.update(999, input())).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('remove', () => {
  it('deletes the row', async () => {
    const created = await repo.create(input(), 1);
    await repo.remove(created.id);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(repo.remove(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('constraint violations store nothing', () => {
  it.each([
    ['category not valid for the type', input({ type: 'income', category: 'food' })],
    ['amount 0', input({ amountCents: 0 })],
    ['a day that does not exist', input({ date: '2026-02-30' })],
  ])('create rejects %s with a StorageError', async (_n, bad) => {
    const error = await repo.create(bad, 1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe('create');
    // The SQLite message (which can quote values) is not passed on.
    expect((error as Error).message).toBe('storage_create');
    expect(await count()).toBe(0);
  });

  it('update leaves the row unchanged when it violates a constraint', async () => {
    const created = await repo.create(input(), 1);
    await expect(repo.update(created.id, input({ amountCents: 0 }))).rejects.toBeInstanceOf(
      StorageError,
    );
    expect(await repo.getById(created.id)).toEqual(created);
  });
});

it('wraps failures on a closed database in StorageError', async () => {
  db.close();
  await expect(repo.listByMonth({ year: 2026, month: 9 })).rejects.toBeInstanceOf(StorageError);
  // Reopen so afterEach can close it again.
  db = openTestDatabase(temp.file);
});

// The code is the only thing reportError logs, so each operation must name itself.
it.each([
  ['list', (r: TransactionRepository) => r.listByMonth({ year: 2026, month: 9 })],
  ['list', (r: TransactionRepository) => r.listRange({ year: 2026, month: 8 }, { year: 2026, month: 9 })],
  ['get', (r: TransactionRepository) => r.getById(1)],
  ['create', (r: TransactionRepository) => r.create(input(), 1)],
  ['update', (r: TransactionRepository) => r.update(1, input())],
  ['remove', (r: TransactionRepository) => r.remove(1)],
])('reports a failed %s with its own code', async (code, run) => {
  db.close();
  const error = await run(repo).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(StorageError);
  expect((error as StorageError).code).toBe(code);
  db = openTestDatabase(temp.file);
});

it('names NotFoundError without any row data', () => {
  const error = new NotFoundError();
  expect(error.name).toBe('NotFoundError');
  expect(error.message).toBe('not_found');
});

it('SC-002: a script of creates, updates and removes matches the hand-calculated summary', async () => {
  const september = { year: 2026, month: 9 };
  let now = 1_000;

  // Decoys that are removed again, or edited away to October: the net result must equal the
  // reference month exactly, whose totals were computed outside the app.
  const decoys = [];
  for (let i = 0; i < 10; i++) {
    decoys.push(await repo.create(input({ amountCents: 1000 + i, date: '2026-09-1' + i }), now++));
  }

  const created = [];
  for (const r of referenceTransactions) {
    created.push(await repo.create({ ...r, note: null }, now++));
  }

  // Edit 10 reference rows to wrong values and back.
  for (const [i, t] of created.slice(0, 10).entries()) {
    await repo.update(t.id, input({ type: 'income', amountCents: 77 + i, category: 'gifts' }));
    const { type, amountCents, category, date } = referenceTransactions[i];
    await repo.update(t.id, { type, amountCents, category, date, note: null });
  }

  for (const d of decoys.slice(0, 5)) await repo.remove(d.id);
  for (const d of decoys.slice(5)) await repo.update(d.id, input({ date: '2026-10-01' }));
  await repo.create(input({ date: '2026-08-31', amountCents: 50000 }), now++);

  const rows = await repo.listByMonth(september);
  expect(rows).toHaveLength(referenceTransactions.length);
  expect(computeSummary(rows)).toEqual(referenceSummary);
});

it('FR-026: rows survive closing and reopening the database', async () => {
  const a = await repo.create(input(), 1);
  const b = await repo.create(input({ type: 'income', category: 'salary', amountCents: 250000 }), 2);
  db.close();

  db = openTestDatabase(temp.file);
  await openAndMigrate(db);
  repo = createTransactionRepository(db);
  expect(await repo.listByMonth({ year: 2026, month: 9 })).toEqual([b, a]);
});

describe('listRange (002)', () => {
  const ym = (year: number, month: number) => ({ year, month });
  const slim = (date: string, amountCents: number) => ({
    type: 'expense',
    amountCents,
    date,
    category: 'food',
  });

  it.each([
    ['inside one year', ym(2026, 8), ym(2026, 9), '2026-07-31', '2026-08-01', '2026-09-30', '2026-10-01'],
    ['across a year end', ym(2025, 11), ym(2026, 1), '2025-10-31', '2025-11-01', '2026-01-31', '2026-02-01'],
    ['ending in a leap February', ym(2024, 1), ym(2024, 2), '2023-12-31', '2024-01-01', '2024-02-29', '2024-03-01'],
    ['ending in a non-leap February', ym(2026, 1), ym(2026, 2), '2025-12-31', '2026-01-01', '2026-02-28', '2026-03-01'],
  ])('%s holds the 1st of `from` and the last day of `to`, nothing outside', async (_n, from, to, before, first, last, after) => {
    await repo.create(input({ date: before, amountCents: 1 }), 1);
    await repo.create(input({ date: last, amountCents: 3 }), 2);
    await repo.create(input({ date: first, amountCents: 2 }), 3);
    await repo.create(input({ date: after, amountCents: 4 }), 4);

    expect(await repo.listRange(from, to)).toEqual([slim(first, 2), slim(last, 3)]);
  });

  it('orders by date, then id, and returns slim rows only', async () => {
    await repo.create(input({ date: '2026-09-20', amountCents: 1, note: 'Late' }), 1);
    await repo.create(input({ date: '2026-09-05', amountCents: 2 }), 9);
    await repo.create(
      input({ date: '2026-09-20', amountCents: 3, type: 'income', category: 'salary' }),
      5,
    );

    expect(await repo.listRange(ym(2026, 9), ym(2026, 9))).toEqual([
      slim('2026-09-05', 2),
      slim('2026-09-20', 1),
      { type: 'income', amountCents: 3, date: '2026-09-20', category: 'salary' },
    ]);
  });

  it('with from === to returns the same rows as listByMonth', async () => {
    for (const [i, date] of ['2026-09-01', '2026-09-15', '2026-09-15', '2026-09-30', '2026-10-01'].entries()) {
      await repo.create(input({ date, amountCents: 100 + i }), i);
    }
    const month = ym(2026, 9);
    const full = await repo.listByMonth(month);
    const asSlim = full
      .map(({ type, amountCents, date, category }) => ({ type, amountCents, date, category }))
      .reverse();

    expect(await repo.listRange(month, month)).toEqual(asSlim);
    expect(asSlim).toHaveLength(4);
  });

  it('returns [] when `from` is after `to`', async () => {
    await repo.create(input({ date: '2026-09-15' }), 1);
    expect(await repo.listRange(ym(2026, 10), ym(2026, 9))).toEqual([]);
    expect(await repo.listRange(ym(2027, 1), ym(2026, 12))).toEqual([]);
  });

  it('reflects an update that moves a row to another month', async () => {
    const created = await repo.create(input({ date: '2026-09-30', amountCents: 7 }), 1);
    await repo.update(created.id, input({ date: '2026-08-31', amountCents: 7 }));

    expect(await repo.listRange(ym(2026, 8), ym(2026, 9))).toEqual([slim('2026-08-31', 7)]);
    expect(await repo.listRange(ym(2026, 9), ym(2026, 9))).toEqual([]);
  });

  it('throws StorageError("list") on a closed database', async () => {
    db.close();
    await expect(repo.listRange(ym(2026, 8), ym(2026, 9))).rejects.toMatchObject({
      name: 'StorageError',
      code: 'list',
    });
    db = openTestDatabase(temp.file);
  });
});
