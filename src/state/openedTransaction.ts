import type { Transaction } from '@/data/transactionRepository';

// The row the user just tapped, handed to the edit form so it mounts with its data before the
// sheet opens. Loading it from the database instead lands mid-animation and makes it stutter.
// Saving and deleting still go to the database, so a row deleted meanwhile is still caught.
let handed: Transaction | null = null;

/** Called by a list right before it opens a transaction. */
export function handOffTransaction(row: Transaction | undefined): void {
  handed = row ?? null;
}

/** The handed row if it is the one being opened; otherwise the form loads it. */
export function handedTransaction(id: number): Transaction | null {
  return handed?.id === id ? handed : null;
}

/** Called when the edit form closes, so a later open by link cannot reuse an old copy. */
export function clearHandedTransaction(): void {
  handed = null;
}
