import { validateDraft, type TransactionDraft } from '@/domain/validation';

const TODAY = '2026-10-05';

const valid: TransactionDraft = {
  type: 'expense',
  amountText: '12,50',
  date: '2026-10-01',
  category: 'food',
  note: '  Lunch  ',
};

describe('validateDraft', () => {
  it('returns the input to store, with cents and a trimmed note', () => {
    expect(validateDraft(valid, TODAY)).toEqual({
      ok: true,
      input: { type: 'expense', amountCents: 1250, date: '2026-10-01', category: 'food', note: 'Lunch' },
    });
  });

  it('stores a blank note as null', () => {
    const result = validateDraft({ ...valid, note: '   ' }, TODAY);
    expect(result.ok && result.input.note).toBeNull();
  });

  it('passes amount errors through', () => {
    expect(validateDraft({ ...valid, amountText: '' }, TODAY)).toEqual({
      ok: false,
      errors: { amount: 'required' },
      firstInvalid: 'amount',
    });
    const result = validateDraft({ ...valid, amountText: '1.250,00' }, TODAY);
    expect(!result.ok && result.errors.amount).toBe('separators');
  });

  it('accepts the date limits, today and 2000-01-01', () => {
    expect(validateDraft({ ...valid, date: TODAY }, TODAY).ok).toBe(true);
    expect(validateDraft({ ...valid, date: '2000-01-01' }, TODAY).ok).toBe(true);
  });

  it('flags a stored date after today (clock change)', () => {
    expect(validateDraft({ ...valid, date: '2026-10-06' }, TODAY)).toEqual({
      ok: false,
      errors: { date: 'dateAfterToday' },
      firstInvalid: 'date',
    });
  });

  it('flags a date before 2000', () => {
    const result = validateDraft({ ...valid, date: '1999-12-31' }, TODAY);
    expect(!result.ok && result.errors.date).toBe('dateBeforeMin');
  });

  it('requires a category valid for the type', () => {
    const missing = validateDraft({ ...valid, category: null }, TODAY);
    expect(!missing.ok && missing.errors.category).toBe('categoryRequired');
    const wrongType = validateDraft({ ...valid, type: 'income', category: 'food' }, TODAY);
    expect(!wrongType.ok && wrongType.errors.category).toBe('categoryInvalid');
    expect(validateDraft({ ...valid, type: 'income', category: 'other' }, TODAY).ok).toBe(true);
  });

  it('counts the note limit in visible characters', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(validateDraft({ ...valid, note: family.repeat(100) }, TODAY).ok).toBe(true);
    const result = validateDraft({ ...valid, note: 'a'.repeat(101) }, TODAY);
    expect(!result.ok && result.errors.note).toBe('noteTooLong');
  });

  it('reports every error and the first invalid field in form order', () => {
    const result = validateDraft(
      { type: 'expense', amountText: '-5', date: '2026-12-01', category: null, note: 'x'.repeat(101) },
      TODAY,
    );
    expect(result).toEqual({
      ok: false,
      errors: { amount: 'invalid', date: 'dateAfterToday', category: 'categoryRequired', note: 'noteTooLong' },
      firstInvalid: 'amount',
    });
    const later = validateDraft({ ...valid, category: null, note: 'x'.repeat(101) }, TODAY);
    expect(!later.ok && later.firstInvalid).toBe('category');
  });
});
