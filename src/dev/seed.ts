// Preview-only seeds for the SC-004 (001) and SC-002 (002) checks (contracts/ui-screens.md). Only
// reached through DevTools, which the summary loads inside the EXPO_PUBLIC_DEV_TOOLS branch.
import type { SqlDatabase } from '@/data/sqlDatabase';
import { categoriesFor, type TransactionType } from '@/domain/categories';
import {
  addMonths,
  compareMonths,
  daysInMonth,
  MIN_MONTH,
  monthOf,
  type IsoDate,
  type YearMonth,
} from '@/domain/month';

export const SEED_COUNT = 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** The current month and the six before it, for "Seed 7 months" (SC-002). */
export const SEED_MONTHS = 7;

/** A month to fill, and its last day to use: today for the current month. */
type SeedMonth = { ym: YearMonth; lastDay: number };

/**
 * Inserts SEED_COUNT random valid transactions dated from the 1st of today's month to today, for
 * the SC-004 check (001).
 */
export function seedCurrentMonth(
  db: SqlDatabase,
  today: IsoDate,
  random: () => number = Math.random,
): Promise<void> {
  return seedMonths(db, [currentSeedMonth(today)], random);
}

/**
 * Inserts SEED_COUNT random valid transactions in each of today's month (up to today) and the six
 * months before it, for the SC-002 check (002, research R10). Months before MIN_MONTH are skipped:
 * the app never shows them.
 */
export function seedSevenMonths(
  db: SqlDatabase,
  today: IsoDate,
  random: () => number = Math.random,
): Promise<void> {
  const current = currentSeedMonth(today);
  const months: SeedMonth[] = [current];
  for (let back = 1; back < SEED_MONTHS; back++) {
    const ym = addMonths(current.ym, -back);
    if (compareMonths(ym, MIN_MONTH) < 0) break;
    months.push({ ym, lastDay: daysInMonth(ym) });
  }
  return seedMonths(db, months, random);
}

function currentSeedMonth(today: IsoDate): SeedMonth {
  return { ym: monthOf(today), lastDay: Number(today.slice(8, 10)) };
}

/** One SQL transaction for every month: all rows land or none do, and SQLite writes it faster. */
async function seedMonths(db: SqlDatabase, months: readonly SeedMonth[], random: () => number): Promise<void> {
  const pick = (n: number) => Math.floor(random() * n);
  const now = Date.now();

  await db.execAsync('BEGIN');
  try {
    for (const { ym, lastDay } of months) {
      for (let i = 0; i < SEED_COUNT; i++) {
        // Mostly expenses, like a real month, so the breakdown has something to show.
        const type: TransactionType = random() < 0.85 ? 'expense' : 'income';
        const categories = categoriesFor(type);
        const maxCents = type === 'expense' ? 20_000 : 300_000;
        await db.runAsync(
          'INSERT INTO transactions (type, amount_cents, date, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          type,
          1 + pick(maxCents),
          `${ym.year}-${pad(ym.month)}-${pad(1 + pick(lastDay))}`,
          categories[pick(categories.length)].key,
          random() < 0.5 ? null : `Seed ${i + 1}`,
          now,
        );
      }
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK').catch(() => {});
    throw e;
  }
}
