import { haptics } from '@/lib/haptics';
import { useSummaryNotice, type LastChange } from '@/state/SummaryNoticeContext';
import { useToast } from '@/state/ToastContext';

/**
 * What a form does right after a save or delete that really happened: the summary animates the
 * row (FR-019), one haptic confirms it, and the toast says so (FR-032). Failures never get here,
 * and neither does a delete of a transaction that was already gone.
 */
export function useConfirmChange(): (change: LastChange) => void {
  const { recordChange } = useSummaryNotice();
  const toast = useToast();
  return (change) => {
    recordChange(change);
    if (change.kind === 'deleted') {
      haptics.deleted();
      toast.show('Deleted');
    } else {
      haptics.saved();
      toast.show('Saved');
    }
  };
}
