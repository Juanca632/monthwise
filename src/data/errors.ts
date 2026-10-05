// Neither error keeps the original message or cause: SQLite messages can quote the values that
// failed a constraint, which may be financial data (principle III).

export type StorageErrorCode =
  | 'db_open'
  | 'migrate'
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'remove'
  | 'simulated';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode) {
    super(`storage_${code}`);
    this.name = 'StorageError';
    this.code = code;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('not_found');
    this.name = 'NotFoundError';
  }
}
