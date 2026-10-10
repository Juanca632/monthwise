import type { Variant } from '@/lib/variant';

type Handler = (error: unknown, isFatal?: boolean) => void;

const METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

let installedHandler: Handler | null;
let originalConsole: Partial<Record<(typeof METHODS)[number], unknown>>;
let writes: string[];

beforeEach(() => {
  installedHandler = null;
  writes = [];
  originalConsole = {};
  for (const m of METHODS) {
    originalConsole[m] = console[m];
    // Stand-ins that record calls, so a test can see whether a method was replaced.
    console[m] = jest.fn((...args: unknown[]) => writes.push(`${m}:${args.join(' ')}`));
  }
  (globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
    setGlobalHandler: (h: Handler) => {
      installedHandler = h;
    },
    getGlobalHandler: () => installedHandler,
  };
});

afterEach(() => {
  for (const m of METHODS) console[m] = originalConsole[m] as never;
  jest.resetModules();
});

/** Loads the logging modules fresh, with `getVariant` returning `variant`. */
function load(variant: Variant | undefined) {
  let mods!: {
    devLog: typeof import('@/lib/devLog');
    silenceLogs: typeof import('@/lib/silenceLogs');
  };
  jest.isolateModules(() => {
    // An unset variant goes through the real getVariant with no extra in the config.
    if (variant === undefined) {
      jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
    } else {
      jest.doMock('@/lib/variant', () => ({ getVariant: () => variant }));
    }
    mods = {
      devLog: require('@/lib/devLog'),
      silenceLogs: require('@/lib/silenceLogs'),
    };
  });
  return mods;
}

function callEveryMethod() {
  for (const m of METHODS) console[m]('amount 1250');
}

describe.each([
  ['unset', undefined],
  ['production', 'production'],
  ['preview', 'preview'],
] as const)('variant %s', (_name, variant) => {
  it('makes every console method write nothing', () => {
    load(variant);
    callEveryMethod();
    expect(writes).toEqual([]);
  });

  it('installs a handler that calls onFatal only for fatal errors', () => {
    const { silenceLogs } = load(variant);
    const onFatal = jest.fn();
    silenceLogs.setFatalListener(onFatal);

    installedHandler?.(new Error('secret 12,50'), false);
    expect(onFatal).not.toHaveBeenCalled();

    installedHandler?.(new Error('secret 12,50'), true);
    expect(onFatal).toHaveBeenCalledTimes(1);
    expect(writes.join('\n')).not.toContain('secret');
  });
});

describe('devLog', () => {
  it('writes in preview', () => {
    const { devLog } = load('preview');
    devLog.devLog('timing db-open 12');
    expect(writes).toEqual(['log:[monthwise] timing db-open 12']);
  });

  it('writes the insights-ready timing in preview, as ms only', () => {
    const { devLog } = load('preview');
    devLog.logTiming('insights-ready', 412.6);
    expect(writes).toEqual(['log:[monthwise] timing insights-ready 413']);
  });

  it('writes nothing in production', () => {
    const { devLog } = load('production');
    devLog.devLog('timing db-open 12');
    devLog.logTiming('db-open', 12);
    devLog.logTiming('insights-ready', 412);
    expect(writes).toEqual([]);
  });

  it('reports non-fatal errors as a code in preview', () => {
    load('preview');
    installedHandler?.(new Error('secret'), false);
    expect(writes).toEqual(['log:[monthwise] error js_nonfatal']);
  });
});

describe('variant development', () => {
  it('leaves the console and the global handler untouched', () => {
    const before = METHODS.map((m) => console[m]);
    load('development');
    expect(METHODS.map((m) => console[m])).toEqual(before);
    expect(installedHandler).toBeNull();
    callEveryMethod();
    expect(writes).toHaveLength(METHODS.length);
  });
});
