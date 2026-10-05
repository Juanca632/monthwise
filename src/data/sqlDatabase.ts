export type SqlParam = string | number | null;

/**
 * The subset of expo-sqlite's SQLiteDatabase the data layer uses. Keeping it this small lets the
 * integration tests run the same SQL on Node through better-sqlite3 (research R4, R10).
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlParam[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, ...params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: SqlParam[]): Promise<T | null>;
}
