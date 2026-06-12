import { type Database } from "sql.js";

// ---------------------------------------------------------------------------
// 迁移类型
// ---------------------------------------------------------------------------

export interface Migration {
  /** 版本号 */
  version: number;
  /** 升级 SQL */
  up: string;
  /** 回滚 SQL */
  down: string;
}

export interface MigrationRecord {
  version: number;
  applied_at: number;
}

// ---------------------------------------------------------------------------
// MigrationManager
// ---------------------------------------------------------------------------

export class MigrationManager {
  private _db: Database;
  private _saveFn: () => void;

  constructor(db: Database, saveFn: () => void) {
    this._db = db;
    this._saveFn = saveFn;
    this._initTable();
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  private _initTable(): void {
    this._db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }

  // ── 获取当前版本 ──────────────────────────────────────────────────────────

  getCurrentVersion(): number {
    const stmt = this._db.prepare(`SELECT MAX(version) as version FROM _migrations`);
    const result = stmt.step() ? (stmt.getAsObject() as { version: number | null }).version : null;
    stmt.free();
    return result ?? 0;
  }

  // ── 获取已应用的迁移 ──────────────────────────────────────────────────────

  getAppliedMigrations(): MigrationRecord[] {
    const stmt = this._db.prepare(`SELECT * FROM _migrations ORDER BY version`);
    const results: MigrationRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as MigrationRecord);
    }
    stmt.free();
    return results;
  }

  // ── 执行迁移 ──────────────────────────────────────────────────────────────

  /**
   * 执行迁移，自动检测版本并应用
   */
  migrate(migrations: Migration[]): void {
    const currentVersion = this.getCurrentVersion();
    const pending = migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      return;
    }

    for (const migration of pending) {
      this._db.run(migration.up);
      this._db.run(
        `INSERT INTO _migrations (version, applied_at) VALUES (?, ?)`,
        [migration.version, Math.floor(Date.now() / 1000)],
      );
    }

    this._saveFn();
  }

  // ── 回滚 ──────────────────────────────────────────────────────────────────

  /**
   * 回滚到指定版本
   */
  rollback(migrations: Migration[], targetVersion: number): void {
    const currentVersion = this.getCurrentVersion();
    const toRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of toRollback) {
      this._db.run(migration.down);
      this._db.run(`DELETE FROM _migrations WHERE version = ?`, [migration.version]);
    }

    this._saveFn();
  }
}
