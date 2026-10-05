import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { ignoreListBatchingWarnings } from '../helpers/listWarnings';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
// See summaryScreen.test.tsx: the real expo-font needs expo-asset, which Jest cannot resolve.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
// The test renderer has no native views, so the real findNodeHandle returns null.
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: () => 42,
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

/**
 * A tiny stand-in for the router: `push` opens the edit modal over the summary, `back` closes it
 * and gives the summary focus again, which reloads it (FR-019).
 */
const mockNav = {
  open: (_id: string) => {},
  close: () => {},
  focusSummary: null as (() => void) | null,
  params: { id: '' },
};
const mockDispatch = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({
      push: (to: { params: { id: string } }) => mockNav.open(to.params.id),
      back: () => mockNav.close(),
    }),
    useNavigation: () => ({ dispatch: mockDispatch }),
    useLocalSearchParams: () => mockNav.params,
    useFocusEffect: (effect: () => void) => {
      mockNav.focusSummary = effect;
      useEffect(() => effect(), [effect]);
    },
  };
});

// See transactionFormNew.test.tsx: `leave()` acts like Android's back button.
const mockGuard: {
  prevent: boolean;
  callback: ((e: { data: { action: object } }) => void) | null;
} = { prevent: false, callback: null };
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (prevent: boolean, callback: (e: { data: { action: object } }) => void) => {
    mockGuard.prevent = prevent;
    mockGuard.callback = callback;
  },
}));
const BACK = { type: 'GO_BACK' };

const SummaryScreen = require('@/app/index').default;
const EditTransactionScreen = require('@/app/transaction/[id]').default;

let db: TestDatabase;
const month: { current: SelectedMonthValue | null } = { current: null };

function App() {
  month.current = useSelectedMonth();
  const [openId, setOpenId] = useState<string | null>(null);
  mockNav.open = (id) => {
    mockNav.params = { id };
    setOpenId(id);
  };
  mockNav.close = () => {
    setOpenId(null);
    mockNav.focusSummary?.();
  };
  return (
    <>
      <SummaryScreen />
      {openId !== null && <EditTransactionScreen key={openId} />}
    </>
  );
}

const flush = () => act(async () => {});

async function renderApp(rows: TransactionInput[]) {
  db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <App />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await flush();
}

const eur = (amount: string) => `${amount} €`;
const lunch: TransactionInput = {
  type: 'expense',
  amountCents: 1250,
  date: '2026-10-05',
  category: 'food',
  note: 'lunch',
};
const rent: TransactionInput = {
  type: 'expense',
  amountCents: 50000,
  date: '2026-10-01',
  category: 'housing',
  note: null,
};

/**
 * A category chip. The summary's list stays rendered under the modal, and RNTL also matches a
 * button by its visible text, so the "Expense, Food, …" row would match "Food" too.
 */
const chip = (label: string) =>
  screen.getAllByRole('button', { name: label }).find((b) => b.props.accessibilityLabel === label)!;
const formOpen = () => screen.queryByRole('header', { name: 'Edit transaction' }) !== null;
const amountInput = () => screen.getByTestId('amount-input');
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const stored = () => db.raw.prepare('SELECT * FROM transactions ORDER BY id').all() as Record<string, unknown>[];

/** Taps a list row and waits for the form to load. */
async function openRow(spokenStart: string) {
  fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${spokenStart}`) }));
  await flush();
}

async function saveForm() {
  press('Save');
  await flush();
}

/** Answers the last native dialog with the button that has this text. */
function answerDialog(text: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
  // Cancel has no handler: the native dialog just closes.
  act(() => buttons.find((b) => b.text === text)!.onPress?.());
}

ignoreListBatchingWarnings();

beforeEach(() => {
  mockOpen.mockReset();
  mockDispatch.mockClear();
  jest.mocked(DateTimePickerAndroid.open).mockClear();
  jest.spyOn(Alert, 'alert').mockClear();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
  jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
  jest.mocked(AccessibilityInfo.setAccessibilityFocus).mockClear();
});

describe('opening (FR-011)', () => {
  it('shows a loading state, then the stored values in the region format', async () => {
    await renderApp([lunch]);
    fireEvent.press(screen.getByRole('button', { name: /^Expense, Food/ }));

    expect(formOpen()).toBe(true);
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();

    await flush();
    expect(amountInput().props.value).toBe('12,50');
    expect(chip('Food').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText(/^Note \(optional\)/).props.value).toBe('lunch');
    expect(screen.getByText('05/10/2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('closes and shows a banner when the transaction cannot be loaded (FR-025)', async () => {
    await renderApp([lunch]);
    db.raw.exec('DELETE FROM transactions');
    await openRow('Expense, Food');

    expect(formOpen()).toBe(false);
    expect(screen.getByText("Couldn't open this transaction.")).toBeTruthy();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Couldn't open this transaction.",
    );
  });
});

describe('editing', () => {
  it('12,50 → 21,50 updates the list, totals and breakdown', async () => {
    await renderApp([lunch, rent]);
    await openRow('Expense, Food');
    fireEvent.changeText(amountInput(), '21,50');
    await saveForm();

    expect(formOpen()).toBe(false);
    expect(stored()[0]).toMatchObject({ amount_cents: 2150, created_at: 1 });
    await flush();
    expect(screen.getByLabelText(`Expenses, ${eur('521,50')}`)).toBeTruthy();
    // RNTL turns the no-break space into a plain one before applying a RegExp.
    expect(screen.getByLabelText(/^Expense, Food, 21,50 €/)).toBeTruthy();
    expect(screen.getByLabelText(`Food, ${eur('21,50')}, 4 percent`)).toBeTruthy();
  });

  it('changing to income clears the category and asks for a new one (FR-012)', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    fireEvent.press(screen.getByRole('radio', { name: 'Income' }));
    await saveForm();

    expect(screen.getByText('Pick a category.')).toBeTruthy();
    expect(stored()[0]).toMatchObject({ type: 'expense', category: 'food' });

    press('Salary');
    await saveForm();
    expect(stored()[0]).toMatchObject({ type: 'income', category: 'salary' });
  });

  it('moving the date to the previous month shows that month (FR-020)', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    press(/^Date, /);
    const { onValueChange } = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    act(() => onValueChange!({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2026, 8, 30)));
    await saveForm();
    await flush();

    expect(month.current!.selected).toEqual({ year: 2026, month: 9 });
    expect(screen.getByRole('header', { name: 'September 2026' })).toBeTruthy();
    expect(screen.getByLabelText(/^Expense, Food, .*, 30 September 2026/)).toBeTruthy();
  });

  it('saving without changes keeps the same cents (FR-005)', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    await saveForm();

    expect(screen.queryByText(/Use up to 2 decimals/)).toBeNull();
    expect(formOpen()).toBe(false);
    expect(stored()[0]).toMatchObject({ amount_cents: 1250 });
  });

  it('closing without changes does not ask, though the amount was pre-formatted (FR-010)', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    expect(mockGuard.prevent).toBe(false);

    fireEvent.changeText(amountInput(), '13');
    act(() => mockGuard.callback!({ data: { action: BACK } }));
    expect(Alert.alert).toHaveBeenCalledWith('Discard changes?', undefined, expect.any(Array));
  });

  it('a stored date after today is flagged on Save, and kept until another is picked', async () => {
    await renderApp([{ ...lunch, date: '2026-10-20' }]);
    await openRow('Expense, Food');
    expect(screen.getByText('20/10/2026')).toBeTruthy();

    await saveForm();
    expect(screen.getByText('Pick a date up to today.')).toBeTruthy();
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42);
    expect(stored()[0]).toMatchObject({ date: '2026-10-20' });

    // The dialog opens on today, the latest date it allows.
    press(/^Date, /);
    expect(jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0].value).toEqual(new Date(2026, 9, 15));
    expect(screen.getByText('20/10/2026')).toBeTruthy();
  });
});

describe('save and delete failures (FR-025)', () => {
  it('update on a removed row keeps the form with "This transaction no longer exists."', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    db.raw.exec('DELETE FROM transactions');
    fireEvent.changeText(amountInput(), '20');
    await saveForm();

    expect(formOpen()).toBe(true);
    expect(screen.getByText('This transaction no longer exists.')).toBeTruthy();
    expect(amountInput().props.value).toBe('20');
  });

  it('a storage error on update shows the save message and keeps the content', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    db.raw.exec('DROP TABLE transactions');
    fireEvent.changeText(amountInput(), '20');
    await saveForm();

    expect(screen.getByText("Couldn't save. Your changes are still here.")).toBeTruthy();
    expect(amountInput().props.value).toBe('20');
  });

  it('a storage error on delete shows "Couldn\'t delete." and keeps the content', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    db.raw.exec('DROP TABLE transactions');
    press('Delete');
    answerDialog('Delete');
    await flush();

    expect(formOpen()).toBe(true);
    expect(screen.getByText("Couldn't delete.")).toBeTruthy();
    expect(amountInput().props.value).toBe('12,50');
  });

  it('deleting a row that is already gone closes the form and the summary reloads', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    db.raw.exec('DELETE FROM transactions');
    press('Delete');
    answerDialog('Delete');
    await flush();

    expect(formOpen()).toBe(false);
    expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
  });
});

describe('deleting (FR-013)', () => {
  it('asks first; Delete removes the transaction and the totals return', async () => {
    await renderApp([lunch, rent]);
    await openRow('Expense, Food');
    press('Delete');

    expect(Alert.alert).toHaveBeenCalledWith('Delete this transaction?', undefined, expect.any(Array));
    expect(stored()).toHaveLength(2);
    answerDialog('Delete');
    await flush();

    expect(formOpen()).toBe(false);
    expect(stored()).toHaveLength(1);
    expect(screen.queryByLabelText(/^Expense, Food/)).toBeNull();
    expect(screen.getByLabelText(`Expenses, ${eur('500,00')}`)).toBeTruthy();
  });

  it('Cancel changes nothing', async () => {
    await renderApp([lunch]);
    await openRow('Expense, Food');
    press('Delete');
    answerDialog('Cancel');
    await flush();

    expect(formOpen()).toBe(true);
    expect(stored()).toHaveLength(1);
  });
});

describe('the summary banner', () => {
  async function showBanner() {
    await renderApp([lunch, rent]);
    // Only the lunch row disappears, so the rent row can still be opened afterwards.
    db.raw.exec("DELETE FROM transactions WHERE category = 'food'");
    await openRow('Expense, Food');
    expect(screen.getByText("Couldn't open this transaction.")).toBeTruthy();
  }

  it('Dismiss clears it', async () => {
    await showBanner();
    press('Dismiss');
    expect(screen.queryByText("Couldn't open this transaction.")).toBeNull();
  });

  it('opening another transaction clears it', async () => {
    await showBanner();
    await openRow('Expense, Housing');
    expect(formOpen()).toBe(true);
    expect(screen.queryByText("Couldn't open this transaction.")).toBeNull();
  });
});
