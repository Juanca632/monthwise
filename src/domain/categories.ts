export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'bills'
  | 'health'
  | 'shopping'
  | 'leisure'
  | 'other';

export type IncomeCategory = 'salary' | 'freelance' | 'gifts' | 'other';

export type CategoryKey = ExpenseCategory | IncomeCategory;

export type Category = { key: CategoryKey; label: string };

// Keys are stored identifiers and must never change; labels are UI text and may.
// 'other' exists under both types, so a category is identified by type + key.
const EXPENSE_CATEGORIES: readonly Category[] = [
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'housing', label: 'Housing' },
  { key: 'bills', label: 'Bills' },
  { key: 'health', label: 'Health' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'leisure', label: 'Leisure' },
  { key: 'other', label: 'Other' },
];

const INCOME_CATEGORIES: readonly Category[] = [
  { key: 'salary', label: 'Salary' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'gifts', label: 'Gifts' },
  { key: 'other', label: 'Other' },
];

export function categoriesFor(type: TransactionType): readonly Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategory(type: TransactionType, key: string): boolean {
  return categoriesFor(type).some((c) => c.key === key);
}

export function labelFor(type: TransactionType, key: CategoryKey): string {
  const found = categoriesFor(type).find((c) => c.key === key);
  if (!found) {
    // Deliberately no type/key in the message: avoid leaking user data into logs.
    throw new Error('Invalid category for transaction type');
  }
  return found.label;
}
