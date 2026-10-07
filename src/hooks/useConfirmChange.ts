import { haptics } from '@/lib/haptics';
import { useSummaryNotice, type LastChange } from '@/state/SummaryNoticeContext';
import { useToast } from '@/state/ToastContext';

/**
 * What a form does after a save or delete that really happened. The haptic confirms it at once
 * (native, free); the returned function does the rest, which the form runs once its sheet is gone:
 * the summary animates the row (FR-019) and the toast says so (FR-032). Running those while the
 * sheet slid down re-rendered both lists mid-slide and dropped frames (fine-tuning 2026-10-07).
 * Failures never get here, and neither does a delete of a transaction that was already gone.
 */
export function useConfirmChange(): (change: LastChange) => () => void {
  const { recordChange } = useSummaryNotice();
  const toast = useToast();
  return (change) => {
    if (change.kind === 'deleted') haptics.deleted();
    else haptics.saved();
    return () => {
      recordChange(change);
      toast.show(change.kind === 'deleted' ? 'Deleted' : 'Saved');
    };
  };
}
