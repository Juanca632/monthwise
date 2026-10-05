// Preview-only dev tool: while on, every repository call fails, so the FR-024/FR-025 error paths
// can be checked on a real build. Only loaded inside the EXPO_PUBLIC_DEV_TOOLS branch.
let simulating = false;

export function setSimulateStorageError(on: boolean): void {
  simulating = on;
}

export function isSimulatingStorageError(): boolean {
  return simulating;
}
