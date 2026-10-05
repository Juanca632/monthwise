// VirtualizedList (inside FlatList) schedules a cell update on a 50 ms timer after every update.
// On a slow machine any pause over 50 ms between test steps lets that timer fire outside act(),
// and React prints "An update to VirtualizedList inside a test was not wrapped in act(...)". It is
// an artifact of the list's batching in the test environment, not of app code, so only that exact
// warning is filtered; every other console.error still prints.
// React passes it as a template ("An update to %s inside a test…") plus the component name.
const isListActWarning = (args: unknown[]) =>
  typeof args[0] === 'string' &&
  args[0].includes('inside a test was not wrapped in act') &&
  args.includes('VirtualizedList');

export function ignoreListBatchingWarnings() {
  const original = console.error;
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (isListActWarning(args)) return;
      original(...args);
    });
  });
  afterEach(() => spy.mockRestore());
}
