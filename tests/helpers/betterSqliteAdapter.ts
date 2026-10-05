import Database from 'better-sqlite3';

import type { SqlDatabase, SqlParam } from '@/data/sqlDatabase';

export type TestDatabase = SqlDatabase & { close(): void; raw: Database.Database };

/** `SqlDatabase` over better-sqlite3, so integration tests run the app's real SQL on Node. */
export function openTestDatabase(filename = ':memory:'): TestDatabase {
  const raw = new Database(filename);
  return {
    raw,
    close: () => raw.close(),
    async execAsync(sql: string) {
      raw.exec(sql);
    },
    async runAsync(sql: string, ...params: SqlParam[]) {
      const result = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
    },
    async getAllAsync<T>(sql: string, ...params: SqlParam[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: SqlParam[]) {
      const stmt = raw.prepare(sql);
      // better-sqlite3 refuses get() on statements that return no data, unlike expo-sqlite.
      if (!stmt.reader) {
        stmt.run(...params);
        return null;
      }
      return (stmt.get(...params) ?? null) as T | null;
    },
  };
}
