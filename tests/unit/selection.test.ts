import {
  chartSelection,
  initialChartSelection,
  type ChartSelectionEvent,
  type ChartSelectionState,
} from '@/ui/charts/selection';

const run = (events: ChartSelectionEvent[], from = initialChartSelection): ChartSelectionState =>
  events.reduce(chartSelection, from);

const down = (day: number): ChartSelectionEvent => ({ type: 'down', day });
const move = (day: number): ChartSelectionEvent => ({ type: 'move', day });
const up: ChartSelectionEvent = { type: 'up' };
const cancel: ChartSelectionEvent = { type: 'cancel' };
const activate = (day: number): ChartSelectionEvent => ({ type: 'activate', day });

const tapOn = (day: number) => [down(day), up];

describe('chartSelection (research R5, FR-006, FR-014)', () => {
  it('nothing is selected on open', () => {
    expect(initialChartSelection.selected).toBeNull();
  });

  it('US1-AS13: tap day 8, then day 9 replaces it, then day 9 again hides it', () => {
    const afterEight = run(tapOn(8));
    expect(afterEight.selected).toBe(8);
    const afterNine = run(tapOn(9), afterEight);
    expect(afterNine.selected).toBe(9);
    expect(run(tapOn(9), afterNine).selected).toBeNull();
  });

  it('a move within the touch-down day is still a tap', () => {
    expect(run([down(8), move(8), up]).selected).toBe(8);
  });

  it('US1-AS11: a drag across the chart leaves the lift day selected', () => {
    const state = run([down(3), move(4), move(6), move(8), up]);
    expect(state).toEqual({ selected: 8, touch: null });
  });

  it('the selection follows the finger while dragging', () => {
    expect(run([down(3), move(5)]).selected).toBe(5);
    expect(run([down(3), move(5), move(2)]).selected).toBe(2);
  });

  it('a drag that returns to the touch-down day selects it, not a tap toggle', () => {
    const selectedEight = run(tapOn(8));
    expect(run([down(8), move(9), move(8), up], selectedEight).selected).toBe(8);
    expect(run([down(4), move(5), move(4), up]).selected).toBe(4);
  });

  it('a drag ending on the selected day keeps it selected', () => {
    const selectedTen = run(tapOn(10));
    expect(run([down(7), move(8), move(10), up], selectedTen).selected).toBe(10);
  });

  it('a cancel after down (vertical scroll) changes nothing', () => {
    const selectedFive = run(tapOn(5));
    expect(run([down(9), cancel], selectedFive)).toEqual({ selected: 5, touch: null });
    expect(run([down(9), cancel]).selected).toBeNull();
    // A lift after the cancel belongs to no touch.
    expect(run([down(9), cancel, up], selectedFive).selected).toBe(5);
  });

  it('a tap on the selected day after a drag hides it', () => {
    const dragged = run([down(2), move(6), up]);
    expect(run(tapOn(6), dragged).selected).toBeNull();
  });

  it('activate acts as a tap and toggles', () => {
    const once = run([activate(8)]);
    expect(once.selected).toBe(8);
    expect(run([activate(9)], once).selected).toBe(9);
    expect(run([activate(8), activate(8)]).selected).toBeNull();
  });

  it('reset clears the selection and any touch', () => {
    expect(run([down(3), move(4), { type: 'reset' }])).toEqual(initialChartSelection);
  });

  it('a move or up without a touch changes nothing', () => {
    const selectedFive = run(tapOn(5));
    expect(run([move(9)], selectedFive)).toBe(selectedFive);
    expect(run([up], selectedFive)).toBe(selectedFive);
  });
});
