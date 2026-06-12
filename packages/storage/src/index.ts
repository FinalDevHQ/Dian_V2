import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Logger } from "@myfinal/dian-logger";
import { SqliteLogRepository } from "./sqlite-log.js";
import { SqliteMessageRepository } from "./sqlite-message.js";
import { SqlitePluginStore } from "./sqlite-plugin-store.js";
import { MigrationManager, type Migration } from "./migration.js";
import { TransactionManager } from "./transaction.js";
import { BackupManager } from "./backup.js";
import { watchManager, type WatchEventType, type WatchEvent } from "./watch.js";
import type { LogRepository, MessageRepository, PluginStore, StorageOptions } from "./types.js";

// ---------------------------------------------------------------------------
// StorageService
// ---------------------------------------------------------------------------

export class StorageService {
  private _db: Database | null = null;
  private _dbPath: string = "";
  private _log: SqliteLogRepository | null = null;
  private _message: SqliteMessageRepository | null = null;
  private _pluginStore: SqlitePluginStore | null = null;
  private _migration: MigrationManager | null = null;
  private _transaction: TransactionManager | null = null;
  private _backup: BackupManager | null = null;
  private _logger: Logger;

  constructor() {
    this._logger = new Logger("storage", { level: "info" });
  }

  // ── 属性 ──────────────────────────────────────────────────────────────────

  /** 获取日志仓库 */
  get log(): LogRepository {
    if (!this._log) {
      throw new Error("[storage] 日志仓库未初始化，请先调用 init()");
    }
    return this._log;
  }

  /** 获取消息仓库 */
  get message(): MessageRepository {
    if (!this._message) {
      throw new Error("[storage] 消息仓库未初始化，请先调用 init()");
    }
    return this._message;
  }

  /** 获取插件存储 */
  get pluginStore(): PluginStore {
    if (!this._pluginStore) {
      throw new Error("[storage] 插件存储未初始化，请先调用 init()");
    }
    return this._pluginStore;
  }

  /** 获取迁移管理器 */
  get migration(): MigrationManager {
    if (!this._migration) {
      throw new Error("[storage] 迁移管理器未初始化，请先调用 init()");
    }
    return this._migration;
  }

  /** 获取事务管理器 */
  get transaction(): TransactionManager {
    if (!this._transaction) {
      throw new Error("[storage] 事务管理器未初始化，请先调用 init()");
    }
    return this._transaction;
  }

  /** 获取备份管理器 */
  get backup(): BackupManager {
    if (!this._backup) {
      throw new Error("[storage] 备份管理器未初始化，请先调用 init()");
    }
    return this._backup;
  }

  /** 获取监听管理器 */
  get watch() {
    return watchManager;
  }

  /** 是否已初始化 */
  get isInitialized(): boolean {
    return this._db !== null;
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  /**
   * 初始化存储服务
   */
  async init(options: StorageOptions): Promise<void> {
    const sqlPromise = initSqlJs();
    const SQL = await sqlPromise;

    const sqlitePath = options.sqlite ?? "data/storage.db";
    this._dbPath = resolve(sqlitePath);

    // 确保目录存在
    const dir = dirname(this._dbPath);
    mkdirSync(dir, { recursive: true });

    this._logger.info(`初始化 SQLite: ${this._dbPath}`);

    // 加载或创建数据库
    if (existsSync(this._dbPath)) {
      const buffer = readFileSync(this._dbPath);
      this._db = new SQL.Database(buffer);
    } else {
      this._db = new SQL.Database();
    }

    const saveFn = () => this._save();

    this._log = new SqliteLogRepository(this._db, this._dbPath);
    this._message = new SqliteMessageRepository(this._db, this._dbPath, saveFn);
    this._pluginStore = new SqlitePluginStore(this._db, saveFn);
    this._migration = new MigrationManager(this._db, saveFn);
    this._transaction = new TransactionManager(this._db, this._dbPath, saveFn);
    this._backup = new BackupManager(this._db, this._dbPath, saveFn);

    this._logger.info("存储服务初始化完成");
  }

  // ── 执行迁移 ──────────────────────────────────────────────────────────────

  /**
   * 执行数据库迁移
   */
  migrate(migrations: Migration[]): void {
    if (!this._migration) {
      throw new Error("[storage] 迁移管理器未初始化");
    }
    this._migration.migrate(migrations);
  }

  // ── 备份 ──────────────────────────────────────────────────────────────────

  /**
   * 备份数据库
   */
  backupTo(path: string): void {
    if (!this._backup) {
      throw new Error("[storage] 备份管理器未初始化");
    }
    this._backup.backup(path);
  }

  // ── 保存到磁盘 ────────────────────────────────────────────────────────────

  private _save(): void {
    if (!this._db) return;
    const data = this._db.export();
    writeFileSync(this._dbPath, Buffer.from(data));
  }

  // ── 清理 ──────────────────────────────────────────────────────────────────

  /**
   * 清理过期日志
   */
  cleanup(retentionDays: number = 30): number {
    const count = this._log?.cleanup(retentionDays) ?? 0;
    this._logger.info(`清理了 ${count} 条过期日志`);
    return count;
  }

  // ── 关闭 ──────────────────────────────────────────────────────────────────

  /**
   * 关闭所有连接
   */
  close(): void {
    this._save();
    this._db?.close();
    this._db = null;
    watchManager.clear();
    this._logger.info("存储服务已关闭");
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建存储服务
 *
 * @example
 * const storage = createStorageService();
 * await storage.init({ sqlite: "data/storage.db" });
 *
 * // 迁移
 * storage.migrate([
 *   { version: 1, up: "CREATE TABLE ...", down: "DROP TABLE ..." },
 * ]);
 *
 * // 事务
 * await storage.transaction.batch(items, async (item, ctx) => {
 *   ctx.log.write({ ... });
 * });
 *
 * // 监听
 * storage.watch.on("messages", (event) => {
 *   console.log("新消息:", event);
 * });
 *
 * // 备份
 * storage.backupTo("./backups/backup.db");
 */
export function createStorageService(): StorageService {
  return new StorageService();
}

// 导出类型和实现
export type {
  LogEntry,
  LogQueryParams,
  LogRepository,
  MessageEntry,
  MessageQueryParams,
  MessagePage,
  MessageRepository,
  PluginStore,
  StatsFilter,
  GroupStat,
  UserStat,
  TrendPoint,
  OverviewStats,
  GroupNameEntry,
  StorageOptions,
} from "./types.js";

export type { Migration, MigrationRecord } from "./migration.js";
export type { TransactionContext } from "./transaction.js";
export type { WatchEvent, WatchEventType, WatchCallback } from "./watch.js";

export { SqliteLogRepository } from "./sqlite-log.js";
export { SqliteMessageRepository } from "./sqlite-message.js";
export { SqlitePluginStore } from "./sqlite-plugin-store.js";
export { MigrationManager } from "./migration.js";
export { TransactionManager } from "./transaction.js";
export { BackupManager } from "./backup.js";
export { WatchManager, watchManager } from "./watch.js";
