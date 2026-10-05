import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useDatabase } from '@/data/DatabaseProvider';
import { StorageError } from '@/data/errors';
import { defaultFormDate, monthOf } from '@/domain/month';
import type { TransactionDraft, TransactionInput } from '@/domain/validation';
import { getToday } from '@/hooks/useToday';
import { reportError } from '@/lib/reportError';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { TransactionForm, type FormResult } from '@/ui/TransactionForm';

/** The add form (contracts/ui-screens.md, Transaction form). */
export default function NewTransactionScreen() {
  const router = useRouter();
  const { whenReady } = useDatabase();
  const { selected, setSelected } = useSelectedMonth();

  // Computed once when the form opens (FR-003): today on the current month, otherwise the last
  // day of the month on screen.
  const [initial] = useState<TransactionDraft>(() => ({
    type: 'expense',
    amountText: '',
    date: defaultFormDate(selected, getToday()),
    category: null,
    note: '',
  }));

  const save = async (input: TransactionInput): Promise<FormResult> => {
    try {
      // whenReady, not a repository captured at render: a Save tapped while the database is still
      // opening waits for it (at most 10 s).
      const repository = await whenReady();
      await repository.create(input, Date.now());
    } catch (e) {
      reportError(e instanceof StorageError ? e.code : 'create');
      return "Couldn't save. Your changes are still here.";
    }
    // FR-020: the summary shows the month the transaction landed in.
    setSelected(monthOf(input.date));
    return null;
  };

  return (
    <TransactionForm
      title="Add transaction"
      initial={initial}
      autoFocusAmount
      onSave={save}
      onDone={() => router.back()}
      onClose={() => router.back()}
    />
  );
}
