import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { NotFoundError, StorageError } from '@/data/errors';
import type { Transaction } from '@/data/transactionRepository';
import { monthOf } from '@/domain/month';
import type { TransactionDraft, TransactionInput } from '@/domain/validation';
import { formatAmountForInput } from '@/format/money';
import { useConfirmChange } from '@/hooks/useConfirmChange';
import { useRegion } from '@/hooks/useRegion';
import { reportError } from '@/lib/reportError';
import { clearHandedTransaction, handedTransaction } from '@/state/openedTransaction';
import { useSelectedMonth } from '@/state/SelectedMonthContext';
import { useSummaryNotice } from '@/state/SummaryNoticeContext';
import { Sheet } from '@/ui/Sheet';
import { useTheme } from '@/ui/theme';
import { FormHeader, TransactionForm, type FormResult } from '@/ui/TransactionForm';

const TITLE = 'Edit transaction';

const draftOf = (row: Transaction, tag: string): TransactionDraft => ({
  type: row.type,
  // FR-005: the region's separator and no grouping, so it can be saved back unchanged.
  amountText: formatAmountForInput(row.amountCents, tag),
  date: row.date,
  category: row.category,
  note: row.note ?? '',
});

/** The edit and delete form (contracts/ui-screens.md, Edit form states). */
export default function EditTransactionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { colors } = useTheme();
  const { tag } = useRegion();
  const { whenReady } = useDatabase();
  const { setSelected } = useSelectedMonth();
  const notice = useSummaryNotice();
  const confirmChange = useConfirmChange();
  // The row the list handed over mounts the form before the sheet opens; without one (a link),
  // the sheet shows the loading state until the database answers.
  // Runs once the sheet has slid down, so nothing re-renders the lists behind it mid-slide.
  const afterClose = useRef<(() => void) | null>(null);
  const done = () => {
    router.back();
    afterClose.current?.();
    afterClose.current = null;
  };
  const [initial, setInitial] = useState<TransactionDraft | null>(() => {
    const row = handedTransaction(id);
    return row && draftOf(row, tag);
  });

  useEffect(() => clearHandedTransaction, []);

  // Still read when the list handed the row over, so one deleted meanwhile closes the form with
  // the banner (FR-025); a row that is there changes nothing on screen.
  useEffect(() => {
    const handedOver = initial !== null;
    let cancelled = false;
    (async () => {
      try {
        const row = await (await whenReady()).getById(id);
        if (!row) throw new NotFoundError();
        if (cancelled || handedOver) return;
        setInitial(draftOf(row, tag));
      } catch (e) {
        if (cancelled) return;
        reportError(e instanceof StorageError ? e.code : 'get');
        // FR-025: back to the summary it came from, with a banner explaining why.
        notice.show('open_failed');
        router.back();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Loads once per opened transaction; the form keeps its own state after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (input: TransactionInput): Promise<FormResult> => {
    try {
      await (await whenReady()).update(id, input);
    } catch (e) {
      if (e instanceof NotFoundError) return 'This transaction no longer exists.';
      reportError(e instanceof StorageError ? e.code : 'update');
      return "Couldn't save. Your changes are still here.";
    }
    // Outside the try: the change is stored, so nothing here may turn it into a failure.
    const announce = confirmChange({ kind: 'updated', id });
    afterClose.current = () => {
      announce();
      // FR-020: a date moved to another month takes the summary there.
      setSelected(monthOf(input.date));
    };
    return null;
  };

  const remove = async (): Promise<FormResult> => {
    try {
      await (await whenReady()).remove(id);
    } catch (e) {
      // Already gone: the goal is met, so it closes like a successful delete, without a toast.
      if (e instanceof NotFoundError) return null;
      reportError(e instanceof StorageError ? e.code : 'remove');
      return "Couldn't delete.";
    }
    afterClose.current = confirmChange({ kind: 'deleted', id });
    return null;
  };

  // One sheet for both states, so it does not close and reopen when the transaction loads. The
  // close button goes back like Android's back button: while loading there is nothing to lose
  // and no discard check, so the sheet just goes; once loaded, the form's check runs.
  return (
    <Sheet header={<FormHeader title={TITLE} onClose={() => router.back()} />}>
      {initial ? (
        <TransactionForm initial={initial} onSave={save} onDelete={remove} onDone={done} />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} size="large" />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
