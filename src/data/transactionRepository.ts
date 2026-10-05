import type { TransactionType } from '@/domain/categories';
import { monthRange, type IsoDate, type YearMonth } from '@/domain/month';
import type { TransactionInput } from '@/domain/validation';

import { NotFoundError, StorageError, type StorageErrorCode } from './errors';
import type { SqlDatabase } from './sqlDatabase';

export type Transaction = {
  id: number;
  type: TransactionType;
  amountCents: number;
  date: IsoDate;
  category: string;
  note: string | null;
  createdAt: number;
};

export interface TransactionRepository {
  listByMonth(month: YearMonth): Promise<Transaction[]>;
  getById(id: number): Promise<Transaction | null>;
  create(input: TransactionInput, now: number): Promise<Transaction>;
  update(id: number, input: TransactionInput): Promise<Transaction>;
  remove(id: number): Promise<void>;
}

type Row = {
  id: number;
  type: TransactionType;
  amount_cents: number;
  date: string;
  category: string;
  note: string | null;
  created_at: number;
};

const COLUMNS = 'id, type, amount_cents, date, category, note, created_at';

const toTransaction = (r: Row): Transaction => ({
  id: r.id,
  type: r.type,
  amountCents: r.amount_cents,
  date: r.date,
  category: r.category,
  note: r.note,
  createdAt: r.created_at,
});

// Every failure leaves as a StorageError with a fixed code; the SQLite message is dropped because
// it can quote the values that broke a constraint (contract, Error rules).
async function guard<T>(code: StorageErrorCode, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof StorageError) throw e;
    throw new StorageError(code);
  }
}

export function createTransactionRepository(db: SqlDatabase): TransactionRepository {
  const getById = (id: number) =>
    guard('get', async () => {
      const row = await db.getFirstAsync<Row>(`SELECT ${COLUMNS} FROM transactions WHERE id = ?`, id);
      return row ? toTransaction(row) : null;
    });

  // Reads back what was written, so callers get exactly what the database stored.
  const reread = async (id: number, code: StorageErrorCode) => {
    const stored = await getById(id);
    if (!stored) throw new StorageError(code);
    return stored;
  };

  return {
    listByMonth: (month) =>
      guard('list', async () => {
        const [start, endExclusive] = monthRange(month);
        // id DESC breaks same-day ties by recording order: AUTOINCREMENT ids only grow, while
        // created_at follows the wall clock, which can move back (data-model.md, Ordering).
        const rows = await db.getAllAsync<Row>(
          `SELECT ${COLUMNS} FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC`,
          start,
          endExclusive,
        );
        return rows.map(toTransaction);
      }),

    getById,

    create: (input, now) =>
      guard('create', async () => {
        const { lastInsertRowId } = await db.runAsync(
          'INSERT INTO transactions (type, amount_cents, date, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          input.type,
          input.amountCents,
          input.date,
          input.category,
          input.note,
          now,
        );
        return reread(lastInsertRowId, 'create');
      }),

    update: (id, input) =>
      guard('update', async () => {
        const { changes } = await db.runAsync(
          'UPDATE transactions SET type = ?, amount_cents = ?, date = ?, category = ?, note = ? WHERE id = ?',
          input.type,
          input.amountCents,
          input.date,
          input.category,
          input.note,
          id,
        );
        if (changes === 0) throw new NotFoundError();
        return reread(id, 'update');
      }),

    remove: (id) =>
      guard('remove', async () => {
        const { changes } = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
        if (changes === 0) throw new NotFoundError();
      }),
  };
}
