import { msSinceStartup } from '@/lib/sinceStartup';

const setStartupTiming = (getter: () => unknown) =>
  Object.defineProperty(performance, 'rnStartupTiming', { get: getter, configurable: true });

afterEach(() => {
  delete (performance as unknown as Record<string, unknown>).rnStartupTiming;
  jest.restoreAllMocks();
});

it('counts from the runtime start, not from the clock origin', () => {
  jest.spyOn(performance, 'now').mockReturnValue(416_329_691);
  setStartupTiming(() => ({ startTime: 416_329_275 }));
  expect(msSinceStartup()).toBe(416);
});

it.each([
  ['no startup timing', () => undefined],
  ['a null start time', () => ({ startTime: null })],
  ['a getter that throws', () => {
    throw new Error('native module missing');
  }],
])('returns null with %s', (_name, getter) => {
  setStartupTiming(getter);
  expect(msSinceStartup()).toBeNull();
});

it('returns null when the start is after now (different clocks)', () => {
  jest.spyOn(performance, 'now').mockReturnValue(100);
  setStartupTiming(() => ({ startTime: 200 }));
  expect(msSinceStartup()).toBeNull();
});
