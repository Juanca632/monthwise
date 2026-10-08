// Every rule of FR-006 and FR-014 in one pure reducer (research R5), so tap, drag and scroll are
// unit-tested without gestures. The gesture only sends events; the screen reader's day buttons
// and the trend's month buttons send `activate`.

export type ChartSelectionState = {
  selected: number | null;
  /** The touch in progress: where it went down, and whether it has become a drag. */
  touch: { downDay: number; dragging: boolean } | null;
};

export type ChartSelectionEvent =
  | { type: 'down'; day: number }
  | { type: 'move'; day: number }
  | { type: 'up' }
  | { type: 'cancel' }
  | { type: 'activate'; day: number }
  | { type: 'reset' };

export const initialChartSelection: ChartSelectionState = { selected: null, touch: null };

/** A tap selects the day, or hides its detail when it is already selected. */
const tap = (selected: number | null, day: number): number | null =>
  selected === day ? null : day;

export function chartSelection(
  state: ChartSelectionState,
  event: ChartSelectionEvent,
): ChartSelectionState {
  switch (event.type) {
    case 'down':
      return { ...state, touch: { downDay: event.day, dragging: false } };
    case 'move': {
      const { touch } = state;
      if (!touch) return state;
      // A touch becomes a drag once the finger reaches another day; from then on the selection
      // follows the finger, even back onto the touch-down day.
      if (!touch.dragging && event.day === touch.downDay) return state;
      return { selected: event.day, touch: { ...touch, dragging: true } };
    }
    case 'up': {
      const { touch } = state;
      if (!touch) return state;
      // A drag leaves the lift day selected, never hidden.
      if (touch.dragging) return { selected: state.selected, touch: null };
      return { selected: tap(state.selected, touch.downDay), touch: null };
    }
    case 'cancel':
      // A vertical scroll: the selection stays as it was.
      return state.touch ? { ...state, touch: null } : state;
    case 'activate':
      return { selected: tap(state.selected, event.day), touch: null };
    case 'reset':
      return initialChartSelection;
  }
}
