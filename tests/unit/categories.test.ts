import { categoriesFor, isValidCategory, labelFor } from '@/domain/categories';

describe('categoriesFor', () => {
  it('returns expense categories in order with labels', () => {
    expect(categoriesFor('expense')).toEqual([
      { key: 'food', label: 'Food' },
      { key: 'transport', label: 'Transport' },
      { key: 'housing', label: 'Housing' },
      { key: 'bills', label: 'Bills' },
      { key: 'health', label: 'Health' },
      { key: 'shopping', label: 'Shopping' },
      { key: 'leisure', label: 'Leisure' },
      { key: 'other', label: 'Other' },
    ]);
  });

  it('returns income categories in order with labels', () => {
    expect(categoriesFor('income')).toEqual([
      { key: 'salary', label: 'Salary' },
      { key: 'freelance', label: 'Freelance' },
      { key: 'gifts', label: 'Gifts' },
      { key: 'other', label: 'Other' },
    ]);
  });
});

describe('labelFor', () => {
  it('returns the label for valid pairs', () => {
    expect(labelFor('expense', 'food')).toBe('Food');
    expect(labelFor('income', 'salary')).toBe('Salary');
    expect(labelFor('expense', 'other')).toBe('Other');
    expect(labelFor('income', 'other')).toBe('Other');
  });

  it('throws without leaking data for invalid pairs', () => {
    expect(() => labelFor('income', 'food')).toThrow('Invalid category for transaction type');
    expect(() => labelFor('income', 'food')).not.toThrow(/food|income/);
  });
});

describe('isValidCategory', () => {
  it('accepts every listed key for its own type', () => {
    for (const type of ['expense', 'income'] as const) {
      for (const c of categoriesFor(type)) {
        expect(isValidCategory(type, c.key)).toBe(true);
      }
    }
  });

  it('accepts other under both types', () => {
    expect(isValidCategory('expense', 'other')).toBe(true);
    expect(isValidCategory('income', 'other')).toBe(true);
  });

  it('rejects keys from the other type', () => {
    expect(isValidCategory('income', 'food')).toBe(false);
    expect(isValidCategory('expense', 'salary')).toBe(false);
  });

  it('rejects unknown and mis-cased keys', () => {
    expect(isValidCategory('expense', 'unknown')).toBe(false);
    expect(isValidCategory('expense', '')).toBe(false);
    expect(isValidCategory('expense', 'Food')).toBe(false);
  });
});
