import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import * as ReactNative from 'react-native';
import { AccessibilityInfo, Text, TextInput } from 'react-native';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository, type Transaction } from '@/data/transactionRepository';
import { SelectedMonthProvider, useSelectedMonth, type SelectedMonthValue } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';

import { answerDialog, dialogButtons, openDialog } from '../helpers/confirmDialog';
import { openTestDatabase, type TestDatabase } from '../helpers/betterSqliteAdapter';

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
// See summaryScreen.test.tsx: the real expo-font needs expo-asset, which Jest cannot resolve.
jest.mock('expo-font', () => ({ isLoaded: () => true, loadAsync: jest.fn() }));

let mockLocale = { languageTag: 'es-ES', regionCode: 'ES' };
jest.mock('expo-localization', () => ({ useLocales: () => [mockLocale] }));

const INSETS = { top: 24, bottom: 16, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => INSETS }));

// The test renderer has no native views, so the real findNodeHandle returns null.
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: () => 42,
}));

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

// One haptic per action, for its result (T069): checked in the save and delete tests below.
const mockHaptics = {
  add: jest.fn(),
  monthChange: jest.fn(),
  select: jest.fn(),
  saved: jest.fn(),
  deleted: jest.fn(),
  invalid: jest.fn(),
};
jest.mock('@/lib/haptics', () => ({ haptics: mockHaptics }));
beforeEach(() => Object.values(mockHaptics).forEach((m) => m.mockClear()));
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));

const mockBack = jest.fn();
const mockDispatch = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useNavigation: () => ({ dispatch: mockDispatch }),
}));

// The real hook needs a navigator. This records what the form registered, and `leave()` acts like
// Android's back button: it is blocked and handed to the callback while the form prevents it.
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
const mockLeftWithoutPrompt = jest.fn();
const leave = () =>
  act(() => {
    if (mockGuard.prevent) mockGuard.callback!({ data: { action: BACK } });
    else mockLeftWithoutPrompt();
  });

const NewTransactionScreen = require('@/app/transaction/new').default;

let db: TestDatabase;
const rows = () => db.raw.prepare('SELECT * FROM transactions').all() as Record<string, unknown>[];

/** An opened database, or one whose opening the test controls. */
async function readyDatabase() {
  db = openTestDatabase();
  await openAndMigrate(db);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));
}

const month: { current: SelectedMonthValue | null } = { current: null };

/** The form as the app shows it. `beforeForm` runs first, e.g. to pick another month. */
function renderForm(beforeForm?: (m: SelectedMonthValue) => void) {
  function Harness() {
    month.current = useSelectedMonth();
    const [ready, setReady] = useState(!beforeForm);
    if (!ready) {
      return (
        <Text
          testID="before-form"
          onPress={() => {
            beforeForm!(month.current!);
            setReady(true);
          }}
        />
      );
    }
    return <NewTransactionScreen />;
  }
  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <Harness />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  if (beforeForm) fireEvent.press(screen.getByTestId('before-form'));
}

const flush = () => act(async () => {});
const amountInput = () => screen.getByTestId('amount-input');
const typeAmount = (text: string) => fireEvent.changeText(amountInput(), text);
const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const save = async () => {
  pressButton('Save');
  await flush();
};
/** The Date box; its label starts with the field label, as every field's does. */
const dateBox = () => screen.getByRole('button', { name: /^Date, / });

beforeEach(async () => {
  mockOpen.mockReset();
  mockBack.mockClear();
  mockDispatch.mockClear();
  mockLeftWithoutPrompt.mockClear();
  jest.mocked(DateTimePickerAndroid.open).mockClear();
  mockLocale = { languageTag: 'es-ES', regionCode: 'ES' };
  await readyDatabase();
});

describe('defaults (FR-003)', () => {
  it('opens as an empty Expense dated today, with the amount not focused', async () => {
    renderForm();
    await flush();

    expect(screen.getByRole('header', { name: 'Add transaction' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Expense' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('radio', { name: 'Income' }).props.accessibilityState).toEqual({ checked: false });
    expect(amountInput().props.value).toBe('');
    // No keyboard until the user taps the amount, so the whole form shows.
    expect(amountInput().props.autoFocus).toBeFalsy();
    expect(amountInput().props.placeholder).toBe('0,00');
    expect(amountInput().props.keyboardType).toBe('decimal-pad');
    expect(screen.getByText('15/10/2026')).toBeTruthy();
    for (const chip of ['Food', 'Transport', 'Housing', 'Bills', 'Health', 'Shopping', 'Leisure', 'Other']) {
      expect(screen.getByRole('button', { name: chip }).props.accessibilityState).toEqual({ selected: false });
    }
  });

  it('opens on the last day of a past month on screen', async () => {
    renderForm((m) => m.setSelected({ year: 2026, month: 2 }));
    await flush();
    expect(screen.getByText('28/02/2026')).toBeTruthy();
  });
});

it('records an expense in 5 interactions: open, tap the amount, type, chip, Save (SC-001)', async () => {
  const focus = jest.spyOn(TextInput.prototype, 'focus');
  focus.mockClear();
  renderForm(); // 1. open
  await flush();
  // Taps on chips and Save act right away even with the keyboard open.
  expect(screen.UNSAFE_getByType(ReactNative.ScrollView).props.keyboardShouldPersistTaps).toBe('handled');

  fireEvent.press(amountInput()); // 2. tap the amount, which opens the keyboard
  expect(focus).toHaveBeenCalledTimes(1);
  focus.mockRestore();
  typeAmount('12,50'); // 3. type
  pressButton('Food'); // 4. chip
  await save(); // 5. Save

  expect(rows()).toEqual([
    expect.objectContaining({
      type: 'expense',
      amount_cents: 1250,
      date: '2026-10-15',
      category: 'food',
      note: null,
    }),
  ]);
  expect(mockBack).toHaveBeenCalledTimes(1);
  // A success haptic, and no tap haptic for Save itself.
  expect(mockHaptics.saved).toHaveBeenCalledTimes(1);
  expect(mockHaptics.invalid).not.toHaveBeenCalled();
  expect(mockHaptics.select).toHaveBeenCalledTimes(1);
});

it('opens the date picker limited to 2000-01-01..today, and shows the picked date (FR-006)', async () => {
  renderForm();
  await flush();
  fireEvent.press(dateBox());

  const params = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
  expect(params.mode).toBe('date');
  expect(params.minimumDate).toEqual(new Date(2000, 0, 1));
  expect(params.maximumDate).toEqual(new Date(2026, 9, 15));
  expect(params.value).toEqual(new Date(2026, 9, 15));

  act(() => params.onValueChange!({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2026, 8, 3)));
  expect(screen.getByText('03/09/2026')).toBeTruthy();
});

describe('accessibility and layout', () => {
  it('exposes the selected type and chip states', async () => {
    renderForm();
    await flush();
    pressButton('Food');
    expect(screen.getByRole('button', { name: 'Food' }).props.accessibilityState).toEqual({ selected: true });
    // The group is not itself focusable (its radios are), so it is found by label.
    expect(screen.getByLabelText('Type').props.accessibilityRole).toBe('radiogroup');
  });

  it('places the sheet 36 dp below the top inset, with the header under its handle', async () => {
    renderForm();
    await flush();
    expect(ReactNative.StyleSheet.flatten(screen.getByTestId('sheet').props.style).top).toBe(INSETS.top + 36);
    const header = screen.getByTestId('form-header');
    expect(ReactNative.StyleSheet.flatten(header.props.style).paddingTop).toBe(8);
  });

  it('keeps a field\'s outer size at rest, focused and invalid (design.md, borders)', async () => {
    renderForm();
    await flush();
    // Border plus padding on each side; the rest of the box (minHeight, radius) never changes.
    const edges = (node: ReturnType<typeof dateBox>) => {
      const style: ReactNative.ViewStyle = ReactNative.StyleSheet.flatten(node.props.style);
      const border = Number(style.borderWidth);
      return {
        horizontal: border + Number(style.paddingHorizontal),
        vertical: border + Number(style.paddingVertical),
        minHeight: style.minHeight,
      };
    };
    const note = () => screen.getByTestId('note-input');

    const dateAtRest = edges(dateBox());
    const noteAtRest = edges(note());
    expect(ReactNative.StyleSheet.flatten(note().props.style).borderWidth).toBe(1);

    fireEvent(note(), 'focus');
    expect(ReactNative.StyleSheet.flatten(note().props.style).borderWidth).toBe(2);
    expect(edges(note())).toEqual(noteAtRest);
    fireEvent(note(), 'blur');

    // A date after today is invalid on Save.
    fireEvent.press(dateBox());
    const params = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    act(() => params.onValueChange!({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2026, 9, 20)));
    typeAmount('5');
    pressButton('Food');
    await save();
    expect(screen.getByText('Pick a date up to today.')).toBeTruthy();
    expect(ReactNative.StyleSheet.flatten(dateBox().props.style).borderWidth).toBe(2);
    expect(edges(dateBox())).toEqual(dateAtRest);
  });

  it.each([
    ['es-ES', 'ES', 'after'],
    ['en-IE', 'IE', 'before'],
  ])('places the € for %s %s the number', async (languageTag, regionCode, side) => {
    mockLocale = { languageTag, regionCode };
    renderForm();
    await flush();
    // Tree order is screen order in the amount row.
    const order = screen.UNSAFE_root
      .findAll((n) => n.props.testID === 'amount-input' || n.props.testID === 'currency')
      .map((n) => n.props.testID);
    expect(order[0] === 'currency' ? 'before' : 'after').toBe(side);
  });
});

describe('validation (FR-004, FR-005, FR-008, FR-009)', () => {
  let focus: jest.SpyInstance;
  let setAccessibilityFocus: jest.SpyInstance;

  beforeEach(() => {
    focus = jest.spyOn(TextInput.prototype, 'focus');
    focus.mockClear();
    setAccessibilityFocus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
    setAccessibilityFocus.mockClear();
  });

  it.each([
    ['', 'Enter an amount.'],
    ['0', 'Amount must be greater than 0.'],
    ['0,00', 'Amount must be greater than 0.'],
    ['1000000', 'Maximum is 999999,99.'],
    ['1.250,00', 'Use up to 2 decimals and no thousands separators.'],
    ['1.250', 'Use up to 2 decimals and no thousands separators.'],
    ['-5', 'Enter a valid amount.'],
    ['abc', 'Enter a valid amount.'],
  ])('amount %p shows "%s", focuses the amount and saves nothing', async (text, message) => {
    renderForm();
    await flush();
    typeAmount(text);
    pressButton('Food');
    await save();

    expect(screen.getByText(message)).toBeTruthy();
    expect(amountInput().props.accessibilityLabel).toBe(`Amount, ${text || 'required'}, ${message}`);
    expect(focus).toHaveBeenCalled();
    expect(amountInput().props.value).toBe(text);
    expect(rows()).toEqual([]);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('asks for a category and moves screen reader focus to it', async () => {
    renderForm();
    await flush();
    typeAmount('12,50');
    await save();

    expect(screen.getByText('Pick a category.')).toBeTruthy();
    expect(screen.getByLabelText('Category, required, Pick a category.')).toBeTruthy();
    expect(setAccessibilityFocus).toHaveBeenCalledWith(42);
    expect(focus).not.toHaveBeenCalled();
    expect(rows()).toEqual([]);
    expect(mockHaptics.invalid).toHaveBeenCalledTimes(1);
  });

  it('shows every invalid field and focuses the first one', async () => {
    renderForm();
    await flush();
    await save();
    expect(screen.getByText('Enter an amount.')).toBeTruthy();
    expect(screen.getByText('Pick a category.')).toBeTruthy();
    expect(focus).toHaveBeenCalled();
    expect(setAccessibilityFocus).not.toHaveBeenCalled();
  });

  it('a type change clears the category (FR-012)', async () => {
    renderForm();
    await flush();
    typeAmount('100');
    pressButton('Other');
    fireEvent.press(screen.getByRole('radio', { name: 'Income' }));

    expect(screen.getByRole('button', { name: 'Other' }).props.accessibilityState).toEqual({ selected: false });
    expect(screen.queryByRole('button', { name: 'Food' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
    await save();
    expect(screen.getByText('Pick a category.')).toBeTruthy();
  });
});

it('keeps 100 of 150 pasted emoji in the note (FR-007)', async () => {
  renderForm();
  await flush();
  const note = screen.getByLabelText(/^Note \(optional\)/);
  fireEvent.changeText(note, '👍🏽'.repeat(150));
  expect(screen.getByLabelText(/^Note \(optional\)/).props.value).toBe('👍🏽'.repeat(100));
});

describe('"Discard changes?" (FR-010)', () => {
  it('asks when there are changes, and Discard leaves', async () => {
    renderForm();
    await flush();
    typeAmount('5');
    await leave();

    expect(openDialog()).toBe('Discard changes?');
    expect(dialogButtons()).toEqual(['Keep editing', 'Discard']);
    expect(mockDispatch).not.toHaveBeenCalled();
    answerDialog('Discard');
    expect(openDialog()).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(BACK);
  });

  it('Keep editing closes the dialog and keeps the form as it was', async () => {
    renderForm();
    await flush();
    typeAmount('5');
    await leave();

    answerDialog('Keep editing');
    expect(openDialog()).toBeNull();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(amountInput().props.value).toBe('5');
  });

  it('a tap outside the dialog cancels it, like Keep editing', async () => {
    renderForm();
    await flush();
    typeAmount('5');
    await leave();

    // The backdrop is still at opacity 0 here (it fades in), which RNTL counts as hidden.
    fireEvent.press(screen.getByTestId('confirm-dialog-backdrop', { includeHiddenElements: true }));
    expect(openDialog()).toBeNull();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not ask without changes, and takes the keyboard down with the sheet', async () => {
    const dismiss = jest.spyOn(ReactNative.Keyboard, 'dismiss');
    dismiss.mockClear();
    renderForm();
    await flush();
    await leave();
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
    expect(openDialog()).toBeNull();
    // Every removal is held so the sheet can slide down first; a clean form then just goes.
    expect(mockGuard.prevent).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith(BACK);
  });

  it('does not ask once a typed change is undone', async () => {
    renderForm();
    await flush();
    typeAmount('5');
    typeAmount('');
    await leave();
    expect(openDialog()).toBeNull();
  });

  it('does not ask after a successful save', async () => {
    renderForm();
    await flush();
    typeAmount('5');
    pressButton('Food');
    await save();
    expect(mockBack).toHaveBeenCalled();

    // router.back() reaches the guard, which lets it through.
    await leave();
    expect(openDialog()).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(BACK);
  });
});

describe('saving', () => {
  it('a failed save keeps the content and shows the message (FR-025)', async () => {
    db.raw.exec('DROP TABLE transactions');
    renderForm();
    await flush();
    typeAmount('12,50');
    pressButton('Food');
    fireEvent.changeText(screen.getByLabelText(/^Note \(optional\)/), 'lunch');
    await save();

    expect(screen.getByText("Couldn't save. Your changes are still here.")).toBeTruthy();
    expect(amountInput().props.value).toBe('12,50');
    expect(screen.getByRole('button', { name: 'Food' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText(/^Note \(optional\)/).props.value).toBe('lunch');
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockHaptics.saved).not.toHaveBeenCalled();
  });

  it('inserts once on a double tap', async () => {
    renderForm();
    await flush();
    typeAmount('12,50');
    pressButton('Food');
    pressButton('Save');
    pressButton('Save');
    await flush();
    expect(rows()).toHaveLength(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows the saved date\'s month on the summary (FR-020)', async () => {
    renderForm();
    await flush();
    typeAmount('30');
    pressButton('Food');
    fireEvent.press(dateBox());
    const { onValueChange } = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    act(() => onValueChange!({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(2026, 8, 30)));
    // The month switches only once the sheet is gone: when the form navigates back, the summary
    // behind it has not been touched yet, so nothing re-renders it mid-slide.
    let monthAtBack: unknown = null;
    mockBack.mockImplementationOnce(() => {
      monthAtBack = month.current!.selected;
    });
    await save();

    expect(monthAtBack).toEqual({ year: 2026, month: 10 });
    expect(month.current!.selected).toEqual({ year: 2026, month: 9 });
    expect((rows()[0] as Pick<Transaction, 'date'>).date).toBe('2026-09-30');
  });

  it('a Save while the database is opening waits, then succeeds', async () => {
    let finishOpen!: () => void;
    mockOpen.mockReset();
    mockOpen.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOpen = () => resolve(Object.assign(db, { closeAsync: async () => db.close() }));
        }),
    );
    renderForm();
    typeAmount('12,50');
    pressButton('Food');
    await save();
    expect(rows()).toEqual([]);
    expect(mockBack).not.toHaveBeenCalled();

    await act(async () => finishOpen());
    expect(rows()).toHaveLength(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('a Save while the database is opening fails after 10 s', async () => {
    jest.useFakeTimers();
    try {
      mockOpen.mockReset();
      mockOpen.mockImplementation(() => new Promise(() => {}));
      renderForm();
      typeAmount('12,50');
      pressButton('Food');
      pressButton('Save');

      await act(async () => {
        jest.advanceTimersByTime(9_999);
      });
      expect(screen.queryByText("Couldn't save. Your changes are still here.")).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText("Couldn't save. Your changes are still here.")).toBeTruthy();
      expect(amountInput().props.value).toBe('12,50');
    } finally {
      jest.useRealTimers();
    }
  });
});
