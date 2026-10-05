import { parseAmount, type AmountError } from '@/domain/amount';
import { isValidCategory, type TransactionType } from '@/domain/categories';
import type { IsoDate } from '@/domain/month';
import { countGraphemes, normalizeNote, NOTE_MAX_GRAPHEMES } from '@/domain/note';

/** What the form holds before saving (data-model.md, TransactionDraft). */
export type TransactionDraft = {
  type: TransactionType;
  amountText: string;
  date: IsoDate;
  category: string | null;
  note: string;
};

/** What the repository stores (contracts/transaction-repository.md). */
export type TransactionInput = {
  type: TransactionType;
  amountCents: number;
  date: IsoDate;
  category: string;
  note: string | null;
};

export type DraftField = 'amount' | 'date' | 'category' | 'note';

export type DraftError =
  | AmountError
  | 'dateBeforeMin'
  | 'dateAfterToday'
  | 'categoryRequired'
  | 'categoryInvalid'
  | 'noteTooLong';

export type DraftValidation =
  | { ok: true; input: TransactionInput }
  | { ok: false; errors: Partial<Record<DraftField, DraftError>>; firstInvalid: DraftField };

export const MIN_DATE: IsoDate = '2000-01-01';

// The order the form checks and focuses fields in (FR-009).
const FIELD_ORDER: readonly DraftField[] = ['amount', 'date', 'category', 'note'];

/** `today` is passed in, computed at save time, so a form left open past midnight is correct. */
export function validateDraft(draft: TransactionDraft, today: IsoDate): DraftValidation {
  const errors: Partial<Record<DraftField, DraftError>> = {};

  const amount = parseAmount(draft.amountText);
  if (!amount.ok) errors.amount = amount.error;

  // `YYYY-MM-DD` strings compare correctly as text. A stored date can be after today after a
  // clock change; it must be fixed before saving again.
  if (draft.date < MIN_DATE) errors.date = 'dateBeforeMin';
  else if (draft.date > today) errors.date = 'dateAfterToday';

  if (draft.category === null) errors.category = 'categoryRequired';
  else if (!isValidCategory(draft.type, draft.category)) errors.category = 'categoryInvalid';

  if (countGraphemes(draft.note) > NOTE_MAX_GRAPHEMES) errors.note = 'noteTooLong';

  const firstInvalid = FIELD_ORDER.find((field) => errors[field] !== undefined);
  if (firstInvalid !== undefined) return { ok: false, errors, firstInvalid };

  return {
    ok: true,
    input: {
      type: draft.type,
      // Both checked above; the narrowing is lost across the error-collecting branches.
      amountCents: (amount as { ok: true; cents: number }).cents,
      date: draft.date,
      category: draft.category as string,
      note: normalizeNote(draft.note),
    },
  };
}
