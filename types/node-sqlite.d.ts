// Type declarations for node:sqlite (built into Node 22.5+/26) for @types/node 20
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
  export class StatementSync {
    run(...params: Array<SQLInputValue>): { changes: number; lastInsertRowid: number | bigint };
    get(...params: Array<SQLInputValue>): Record<string, SQLOutputValue> | undefined;
    all(...params: Array<SQLInputValue>): Array<Record<string, SQLOutputValue>>;
  }
  export type SQLInputValue = string | number | bigint | null | Uint8Array;
  export type SQLOutputValue = string | number | bigint | null | Uint8Array;
}
