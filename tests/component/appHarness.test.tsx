// The harness installs its mocks on import, so it comes before any '@/...' module.
import { renderApp } from '../helpers/app';

import { act, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { TransactionInput } from '@/domain/validation';

// The harness's own guarantees (contracts/test-harness.md) for what exists before US1: the pace
// card and the month picker come later, with the members that drive them.

const eur = (amount: string) => `${amount} €`;
const expense = (amountCents: number, date: string, note: string | null = null): TransactionInput => ({
  type: 'expense',
  amountCents,
  date,
  category: 'food',
  note,
});
const income = (amountCents: number, date: string): TransactionInput => ({
  type: 'income',
  amountCents,
  date,
  category: 'salary',
  note: null,
});

const monthHeader = (name: string) => screen.queryByRole('header', { name });
// Pushes the way a screen's own button does; the summary's entry point to Insights comes in US1.
const push = (path: string) => act(async () => require('expo-router').useRouter().push(path));

describe('app harness', () => {
  it("renders the summary for today's month with the seeded rows", async () => {
    const app = await renderApp({
      today: '2026-10-12',
      transactions: [income(200_000, '2026-10-01'), expense(30_000, '2026-10-05', 'lunch'), expense(9_900, '2026-09-30')],
    });
    expect(app.screen).toBe('summary');
    expect(monthHeader('October 2026')).toBeTruthy();
    expect(screen.getByText('lunch')).toBeTruthy();
    expect(screen.getByLabelText(`Income, ${eur('2.000,00')}`)).toBeTruthy();
    expect(screen.getByLabelText(`Expenses, ${eur('300,00')}`)).toBeTruthy();
  });

  it('shows a row added after the first render on the screen on top', async () => {
    const app = await renderApp({ today: '2026-10-12' });
    expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
    const id = await app.add(expense(4_500, '2026-10-10', 'cinema'));
    expect(id).toBeGreaterThan(0);
    expect(screen.getByText('cinema')).toBeTruthy();
    await app.update(id, expense(4_500, '2026-10-10', 'theatre'));
    expect(screen.getByText('theatre')).toBeTruthy();
    await app.remove(id);
    expect(screen.getByText('No transactions this month yet.')).toBeTruthy();
  });

  it('shows the error state when reads fail and the screen reloads', async () => {
    const app = await renderApp({ today: '2026-10-12', transactions: [expense(1_000, '2026-10-02', 'bread')] });
    app.failReads(true);
    await app.add(expense(2_000, '2026-10-03'));
    expect(screen.getByText("Couldn't load your data.")).toBeTruthy();
    app.failReads(false);
    await app.add(expense(3_000, '2026-10-04', 'milk'));
    expect(screen.getByText('milk')).toBeTruthy();
  });

  it('follows the current month when the date passes a month end', async () => {
    const app = await renderApp({ today: '2026-10-31' });
    expect(monthHeader('October 2026')).toBeTruthy();
    await app.setToday('2026-11-01');
    expect(monthHeader('November 2026')).toBeTruthy();
  });

  it('selects a month as the month picker would', async () => {
    const app = await renderApp({ today: '2026-10-12', transactions: [expense(9_900, '2026-09-30', 'dinner')] });
    await app.selectMonth({ year: 2026, month: 9 });
    expect(monthHeader('September 2026')).toBeTruthy();
    expect(screen.getByText('dinner')).toBeTruthy();
  });

  it('pushes Insights and All transactions and goes back, rendering only the top screen', async () => {
    const app = await renderApp({ today: '2026-10-12' });
    await push('/insights');
    expect(app.screen).toBe('insights');
    expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy();
    expect(monthHeader('October 2026')).toBeNull();
    await app.back();
    expect(app.screen).toBe('summary');
    expect(monthHeader('October 2026')).toBeTruthy();

    await push('/transactions');
    expect(app.screen).toBe('transactions');
    await app.back();
    expect(app.screen).toBe('summary');
    await expect(app.back()).rejects.toThrow('the summary is the first screen');
  });

  it("drives the system's screen reader state", async () => {
    const app = await renderApp({ today: '2026-10-12', screenReader: true });
    await expect(AccessibilityInfo.isScreenReaderEnabled()).resolves.toBe(true);
    const seen: boolean[] = [];
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => seen.push(on));
    await app.setScreenReader(false);
    expect(seen).toEqual([false]);
    await expect(AccessibilityInfo.isScreenReaderEnabled()).resolves.toBe(false);
    subscription.remove();
  });

  it('keeps the chart and picker members as stubs until their stories wire them', async () => {
    const app = await renderApp({ today: '2026-10-12' });
    expect(app.paceChart.width).toBe(310);
    await expect(app.paceChart.touch([75])).rejects.toThrow('not wired yet');
    await expect(app.paceChart.tapAt(75)).rejects.toThrow('not wired yet');
    await expect(app.paceChart.dragVertically(75)).rejects.toThrow('not wired yet');
    await expect(app.tapOutsidePicker()).rejects.toThrow('not wired yet');
  });
});
