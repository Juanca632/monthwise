// Worklets' resolver makes Jest load its JS implementation instead of the `.native` one, which
// needs a native module Jest does not have. Setting `resolver` replaces the one from the
// jest-expo preset (React Native's), so this chains both: worklets first, then React Native's.
const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');
const workletsResolver = require('react-native-worklets/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) =>
  workletsResolver(request, {
    ...options,
    defaultResolver: (nextRequest, nextOptions) =>
      reactNativeResolver(nextRequest, { ...nextOptions, defaultResolver: options.defaultResolver }),
  });
