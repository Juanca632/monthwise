type StartupPerformance = { rnStartupTiming?: { startTime?: number | null } };

/**
 * Milliseconds since the React Native runtime started, or `null` when the platform does not report
 * the start. `performance.now()` alone is not enough: on Android it counts from a system clock
 * that has been running for days, so it is measured against the startup time on the same clock.
 */
export function msSinceStartup(): number | null {
  let start: number | null | undefined;
  try {
    // A getter backed by a native module; older runtimes lack it or throw.
    start = (performance as unknown as StartupPerformance).rnStartupTiming?.startTime;
  } catch {
    return null;
  }
  if (start == null) return null;
  const elapsed = performance.now() - start;
  // A negative value would mean the two clocks differ; better no number than a wrong one.
  return elapsed >= 0 ? elapsed : null;
}
