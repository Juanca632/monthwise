// Preview-only seed for the SC-004 check (contracts/ui-screens.md). Only reached through
// DevTools, which the summary loads inside the EXPO_PUBLIC_DEV_TOOLS branch.
import type { SqlDatabase } from '@/data/sqlDatabase';
import { categoriesFor, type TransactionType } from '@/domain/categories';
import { monthOf, type IsoDate } from '@/domain/month';

export const SEED_COUNT = 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Inserts SEED_COUNT random valid transactions dated from the 1st of today's month to today, for
 * the SC-004 check. One SQL transaction: all rows land or none do, and SQLite writes it faster.
 */
export async function seedCurrentMonth(
  db: SqlDatabase,
  today: IsoDate,
  random: () => number = Math.random,
): Promise<void> {
  const { year, month } = monthOf(today);
  const lastDay = Number(today.slice(8, 10));
  const pick = (n: number) => Math.floor(random() * n);
  const now = Date.now();

  await db.execAsync('BEGIN');
  try {
    for (let i = 0; i < SEED_COUNT; i++) {
      // Mostly expenses, like a real month, so the breakdown has something to show.
      const type: TransactionType = random() < 0.85 ? 'expense' : 'income';
      const categories = categoriesFor(type);
      const maxCents = type === 'expense' ? 20_000 : 300_000;
      await db.runAsync(
        'INSERT INTO transactions (type, amount_cents, date, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        type,
        1 + pick(maxCents),
        `${year}-${pad(month)}-${pad(1 + pick(lastDay))}`,
        categories[pick(categories.length)].key,
        random() < 0.5 ? null : `Seed ${i + 1}`,
        now,
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK').catch(() => {});
    throw e;
  }
}
