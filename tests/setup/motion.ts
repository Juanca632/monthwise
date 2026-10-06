// Jest has no native modules: gesture handler's own setup mocks its native side, and Reanimated's
// test mode runs animations on a fake frame clock and adds its style matchers to `expect`.
// Runs after the test framework loads, because Reanimated extends `expect` (its docs, Jest >= 28).
require('react-native-gesture-handler/jestSetup');

// Suites test data by default, so they run as with Android's "Remove animations": amounts jump to
// their value and nothing moves. Reanimated reads this when it loads. Motion suites turn it off by
// mocking `useReducedMotion`; the app passes `ReduceMotion.Never` to its own animations, which
// already follow that hook.
(globalThis as { _REANIMATED_IS_REDUCED_MOTION?: boolean })._REANIMATED_IS_REDUCED_MOTION = true;

// Loading Reanimated here would load React Native's mocked modules before a test file's own
// `jest.mock` calls run, and Jest would keep those first copies (the form tests' `findNodeHandle`
// mock would be ignored). `beforeAll` runs after the test file has registered its mocks.
beforeAll(() => {
  require('react-native-reanimated').setUpTests();
});
