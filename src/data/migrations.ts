import { StorageError } from './errors';
import type { SqlDatabase } from './sqlDatabase';

// Index i holds the SQL that takes the schema from version i to i + 1. Never edit a shipped entry:
// add a new one instead, because phones already ran the old ones.
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 1 AND 99999999),
    date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                                         AND date IS date(date)
                                         AND date >= '2000-01-01'),
    category     TEXT    NOT NULL CHECK (
                   (type = 'expense' AND category IN ('food', 'transport', 'housing', 'bills',
                                                      'health', 'shopping', 'leisure', 'other'))
                OR (type = 'income'  AND category IN ('salary', 'freelance', 'gifts', 'other'))),
    note         TEXT    CHECK (note IS NULL OR length(note) > 0),
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX idx_transactions_date ON transactions (date);`,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Brings an opened database up to the latest schema. Throws `StorageError('migrate')`. */
export async function openAndMigrate(db: SqlDatabase): Promise<void> {
  try {
    // SQLite cannot change the journal mode inside a transaction.
    await db.getFirstAsync('PRAGMA journal_mode = WAL');

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const current = row?.user_version ?? 0;
    if (current >= SCHEMA_VERSION) return;

    // One transaction for all pending steps and the version bump: a crash halfway leaves the
    // database exactly as it was, and the next open retries.
    await db.execAsync('BEGIN');
    try {
      for (let v = current; v < SCHEMA_VERSION; v++) {
        await db.execAsync(MIGRATIONS[v]);
      }
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      await db.execAsync('COMMIT');
    } catch (e) {
      await db.execAsync('ROLLBACK');
      throw e;
    }
  } catch {
    throw new StorageError('migrate');
  }
}
