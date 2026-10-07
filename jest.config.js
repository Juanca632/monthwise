module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  // The first render in a component suite loads React Native cold; with every suite running in
  // parallel on a slow machine (WSL, CI) that alone can pass Jest's 5 s default.
  testTimeout: 30000,
  // Jest defaults to one worker per core minus one (15 here) and each jest-expo worker holds
  // ~0.6-1 GB; that exhausts WSL2's memory and kills the whole VM. Four was also the fastest.
  maxWorkers: 4,
  resolver: '<rootDir>/tests/setup/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/motion.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
