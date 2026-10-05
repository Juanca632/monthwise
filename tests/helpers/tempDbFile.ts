import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** A fresh database path in its own temp directory; WAL needs a real file, not `:memory:`. */
export function tempDbFile(): { file: string; cleanup(): void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'monthwise-'));
  return {
    file: path.join(dir, 'monthwise.db'),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
