import { type Database } from "sql.js";
import { SqliteLogRepository } from "./sqlite-log.js";
import { SqliteMessageRepository } from "./sqlite-message.js";
import { SqlitePluginStore } from "./sqlite-plugin-store.js";
import type { LogRepository, MessageRepository, PluginStore } from "./types.js";

// ---------------------------------------------------------------------------
// TransactionContext
// ---------------------------------------------------------------------------

export interface TransactionContext {
  log: LogRepository;
  message: MessageRepository;
  pluginStore: PluginStore;
}

// ---------------------------------------------------------------------------
// TransactionManager
// ---------------------------------------------------------------------------

export class TransactionManager {
  private _db: Database;
  private _dbPath: string;
  private _saveFn: () => void;

  constructor(db: Database, dbPath: string, saveFn: () => void) {
    this._db = db;
    this._dbPath = dbPath;
    this._saveFn = saveFn;
  }

  /**
   * 在事务中执行操作
   */
  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    this._db.run("BEGIN TRANSACTION");

    try {
      const ctx: TransactionContext = {
        log: new SqliteLogRepository(this._db, this._dbPath),
        message: new SqliteMessageRepository(this._db, this._dbPath, () => {}),
        pluginStore: new SqlitePluginStore(this._db, () => {}),
      };

      const result = await fn(ctx);

      this._db.run("COMMIT");
      this._saveFn();

      return result;
    } catch (err) {
      this._db.run("ROLLBACK");
      throw err;
    }
  }

  /**
   * 批量操作（高性能）
   */
  async batch<T>(items: T[], processor: (item: T, ctx: TransactionContext) => Promise<void>): Promise<void> {
    await this.transaction(async (ctx) => {
      for (const item of items) {
        await processor(item, ctx);
      }
    });
  }
}
