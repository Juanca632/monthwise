module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  // The first render in a component suite loads React Native cold; with every suite running in
  // parallel on a slow machine (WSL, CI) that alone can pass Jest's 5 s default.
  testTimeout: 30000,
  resolver: '<rootDir>/tests/setup/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/motion.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
