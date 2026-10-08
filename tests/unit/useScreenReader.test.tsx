import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useScreenReader } from '@/hooks/useScreenReader';

type Handler = (on: boolean) => void;

/** A fake system: the first answer resolves when the test says so; `change` fires the event. */
function fakeScreenReader() {
  const handlers = new Set<Handler>();
  const remove = jest.fn();
  let answer!: (on: boolean) => void;
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockReturnValue(new Promise<boolean>((resolve) => (answer = resolve)));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    event: string,
    handler: Handler,
  ) => {
    if (event === 'screenReaderChanged') handlers.add(handler);
    return {
      remove: () => {
        remove();
        handlers.delete(handler);
      },
    };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
  return {
    answer: (on: boolean) => act(async () => answer(on)),
    change: (on: boolean) => act(() => handlers.forEach((h) => h(on))),
    handlers,
    remove,
  };
}

afterEach(() => jest.restoreAllMocks());

describe('useScreenReader', () => {
  it('is false until the system answers, then follows the first answer (on)', async () => {
    const system = fakeScreenReader();
    const { result } = renderHook(() => useScreenReader());
    expect(result.current).toBe(false);
    await system.answer(true);
    expect(result.current).toBe(true);
  });

  it('stays false when the first answer is off', async () => {
    const system = fakeScreenReader();
    const { result } = renderHook(() => useScreenReader());
    await system.answer(false);
    expect(result.current).toBe(false);
  });

  it('follows the change event', async () => {
    const system = fakeScreenReader();
    const { result } = renderHook(() => useScreenReader());
    await system.answer(false);
    system.change(true);
    expect(result.current).toBe(true);
    system.change(false);
    expect(result.current).toBe(false);
  });

  it('keeps a change that arrives before the first answer', async () => {
    const system = fakeScreenReader();
    const { result } = renderHook(() => useScreenReader());
    system.change(true);
    await system.answer(false);
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', async () => {
    const system = fakeScreenReader();
    const { unmount } = renderHook(() => useScreenReader());
    await system.answer(false);
    expect(system.handlers.size).toBe(1);
    unmount();
    expect(system.remove).toHaveBeenCalledTimes(1);
    expect(system.handlers.size).toBe(0);
  });
});
