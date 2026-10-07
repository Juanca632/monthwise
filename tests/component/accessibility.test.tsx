import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { openAndMigrate } from '@/data/migrations';
import { createTransactionRepository } from '@/data/transactionRepository';
import type { TransactionInput } from '@/domain/validation';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';
import { Sheet } from '@/ui/Sheet';
import { FormHeader, TransactionForm } from '@/ui/TransactionForm';

import { openTestDatabase } from '../helpers/betterSqliteAdapter';
import { ignoreListBatchingWarnings } from '../helpers/listWarnings';

// FR-031 / SC-007 across the summary and the form: the example announcements from
// contracts/ui-screens.md, touch targets, font scaling and the large-text layouts (design.md).

jest.mock('@/hooks/useToday', () => ({
  useToday: () => '2026-10-15',
  getToday: () => '2026-10-15',
}));
jest.mock('@/lib/devLog', () => ({ devLog: jest.fn(), logTiming: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-localization', () => ({
  useLocales: () => [{ languageTag: 'es-ES', regionCode: 'ES' }],
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: () => 42,
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));
const mockOpen = jest.fn();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (...a: unknown[]) => mockOpen(...a) }));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    useNavigation: () => ({ dispatch: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), [effect]),
  };
});
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));

// A spy on RN.useWindowDimensions does not reach theme.ts, so the module itself is mocked.
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 640, scale: 2, fontScale: mockFontScale }),
}));

const SummaryScreen = require('@/app/index').default;
const { ErrorBoundary } = require('@/app/_layout');

// es-ES puts a no-break space before the €.
const eur = (amount: string) => `${amount} €`;

const rows: TransactionInput[] = [
  { type: 'income', amountCents: 200_000, date: '2026-10-01', category: 'salary', note: null },
  { type: 'expense', amountCents: 200_000, date: '2026-10-03', category: 'housing', note: null },
  { type: 'expense', amountCents: 14_900, date: '2026-10-05', category: 'food', note: 'lunch' },
  { type: 'expense', amountCents: 100, date: '2026-10-06', category: 'bills', note: null },
];

async function renderSummary() {
  const db = openTestDatabase();
  await openAndMigrate(db);
  const repository = createTransactionRepository(db);
  for (const [i, row] of rows.entries()) await repository.create(row, i + 1);
  mockOpen.mockResolvedValue(Object.assign(db, { closeAsync: async () => db.close() }));

  render(
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          <SummaryScreen />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>,
  );
  await act(async () => {});
}

/** The add form as its route draws it: the sheet, its header and the form. */
function renderForm() {
  render(
    <Sheet header={<FormHeader title="Add transaction" onClose={jest.fn()} />}>
      <TransactionForm
        initial={{ type: 'expense', amountText: '', date: '2026-10-15', category: null, note: '' }}
        onSave={async () => null}
        onDone={jest.fn()}
      />
    </Sheet>,
  );
}

const styleOf = (node: ReactTestInstance): TextStyle => StyleSheet.flatten(node.props.style) ?? {};
const isHost = (node: ReactTestInstance) => typeof node.type === 'string';
const hostNodes = (match: (node: ReactTestInstance) => boolean) =>
  screen.root.findAll((node) => isHost(node) && match(node));

/** The nearest native view above `node`; `.parent` alone can be a component wrapper. */
function hostParent(node: ReactTestInstance): ReactTestInstance | null {
  let parent = node.parent;
  while (parent && !isHost(parent)) parent = parent.parent;
  return parent;
}

/** Height from the node's own style, or from a direct child that sets it (list rows do). */
function minHeightOf(node: ReactTestInstance): number {
  const own = (n: ReactTestInstance) => Number(styleOf(n).minHeight ?? styleOf(n).height ?? 0);
  const children = node.findAll((n) => isHost(n) && hostParent(n) === node);
  return Math.max(own(node), ...children.map(own));
}

/** Every tappable control has a role, a label and a ≥ 48 dp touch area (FR-031). */
function expectAccessibleControls() {
  const controls = hostNodes((n) => n.props.onClick !== undefined || n.props.onResponderRelease !== undefined)
    // The amount box only forwards taps to its input, which is the accessible element.
    .filter((n) => n.props.accessible !== false);
  expect(controls.length).toBeGreaterThan(0);
  // Plain strings in the messages: printing a test instance walks the whole tree.
  for (const control of controls) {
    const name: unknown = control.props.accessibilityLabel;
    const role: unknown = control.props.accessibilityRole;
    if (typeof name !== 'string' || name === '') throw new Error(`A ${String(role)} has no label`);
    if (role !== 'button' && role !== 'radio') throw new Error(`"${name}" has role ${String(role)}`);
    const height = minHeightOf(control);
    if (height < 48) throw new Error(`"${name}" is ${height} dp high`);
    const width = styleOf(control).width;
    if (width !== undefined && Number(width) < 48) throw new Error(`"${name}" is ${String(width)} dp wide`);
  }
}

function expectNoFixedFontSize() {
  // Icon glyphs are the exception: @expo/vector-icons turns scaling off, and design.md gives them
  // fixed sizes. All real text must scale.
  const fixed = hostNodes((n) => n.props.allowFontScaling === false).filter(
    (n) => !/feather/i.test(String(styleOf(n).fontFamily ?? '')),
  );
  expect(fixed.length).toBe(0);
}

ignoreListBatchingWarnings();

beforeEach(() => {
  mockFontScale = 1;
  mockOpen.mockReset();
});

describe('summary announcements (contracts/ui-screens.md)', () => {
  it('announces the month header and the previous-month button', async () => {
    await renderSummary();
    expect(screen.getByRole('header', { name: 'October 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous month, September 2026' })).toBeTruthy();
  });

  it('announces the three totals, the balance in words when negative', async () => {
    await renderSummary();
    expect(screen.getByLabelText(`Income, ${eur('2.000,00')}`)).toBeTruthy();
    expect(screen.getByLabelText(`Expenses, ${eur('2.150,00')}`)).toBeTruthy();
    expect(screen.getByLabelText(`Balance, minus ${eur('150,00')}`)).toBeTruthy();
  });

  it('announces each breakdown row with its percent, spelling out "less than 1"', async () => {
    await renderSummary();
    expect(screen.getByLabelText(`Food, ${eur('149,00')}, 7 percent`)).toBeTruthy();
    expect(screen.getByLabelText(`Bills, ${eur('1,00')}, less than 1 percent`)).toBeTruthy();
  });

  it('announces a list item with type, category, amount, full date and note', async () => {
    await renderSummary();
    expect(
      screen.getByRole('button', { name: `Expense, Food, ${eur('149,00')}, 5 October 2026, note: lunch` }),
    ).toBeTruthy();
  });
});

describe('form announcements', () => {
  it('reads a field with its label, value and error', async () => {
    renderForm();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    });
    expect(screen.getByLabelText('Amount, required, Enter an amount.')).toBeTruthy();
    expect(screen.getByLabelText('Category, required, Pick a category.')).toBeTruthy();
  });
});

describe('controls and font scaling', () => {
  it('summary: every control is labeled and at least 48 dp, and text scales', async () => {
    await renderSummary();
    expectAccessibleControls();
    expectNoFixedFontSize();
  });

  it('form: every control is labeled and at least 48 dp, and text scales', () => {
    renderForm();
    expectAccessibleControls();
    expectNoFixedFontSize();
  });

  it('error screen: Try again is labeled and at least 48 dp', () => {
    render(<ErrorBoundary error={new Error('x')} retry={jest.fn()} />);
    expectAccessibleControls();
  });

  it('caps the balance and stat amounts at 1.3x and shrinks them to one line', async () => {
    await renderSummary();
    const amounts = [eur('2.000,00'), eur('2.150,00'), `-${eur('150,00')}`].map((text) =>
      screen.getAllByText(text).find((n) => n.props.adjustsFontSizeToFit),
    );
    for (const amount of amounts) {
      expect(amount?.props).toMatchObject({ numberOfLines: 1, maxFontSizeMultiplier: 1.3 });
    }
  });
});

describe('large text (fontScale 1.3, design.md)', () => {
  const direction = (node: ReactTestInstance | null) => (node ? styleOf(node).flexDirection : undefined);

  it('stacks the stat pills, the breakdown rows and the list amounts', async () => {
    mockFontScale = 1.3;
    await renderSummary();

    const incomePill = screen.getByLabelText(`Income, ${eur('2.000,00')}`);
    expect(direction(hostParent(incomePill))).toBe('column');

    // Breakdown tiles stack their content already; they grow instead of having a fixed width.
    const tile = styleOf(screen.getByLabelText(/^Food, .* percent$/));
    expect(tile.width).toBeUndefined();
    expect(tile.minWidth).toBeGreaterThan(0);

    // A day header's net moves under the day (design.md, Summary screen item 3).
    expect(direction(screen.getAllByLabelText(/, net /)[0])).toBe('column');

    // The amount sits in the text column, under the label, instead of beside it.
    const row = screen.getByRole('button', { name: /^Expense, Food, / });
    const label = row.findAll((n) => isHost(n) && n.props.children === 'Food')[0];
    const column = hostParent(label)!;
    expect(column.findAll((n) => isHost(n) && n.props.children === `-${eur('149,00')}`)).toHaveLength(1);
  });

  it('keeps everything side by side at the default size', async () => {
    await renderSummary();
    expect(direction(hostParent(screen.getByLabelText(`Income, ${eur('2.000,00')}`)))).toBe('row');
  });

  it('keeps Date and Note as rows of one list card in the form', () => {
    mockFontScale = 1.3;
    renderForm();
    // Each is a row (label and value side by side); the card stacks the rows at any text size.
    const dateRow = hostParent(screen.getByText('Date'))!;
    expect(direction(dateRow)).toBe('row');
    expect(direction(hostParent(dateRow))).not.toBe('row');
  });
});
