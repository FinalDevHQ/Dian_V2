import { type Database } from "sql.js";
import type { PluginStore } from "./types.js";

// ---------------------------------------------------------------------------
// SqlitePluginStore
// ---------------------------------------------------------------------------

export class SqlitePluginStore implements PluginStore {
  private _db: Database;
  private _saveFn: () => void;

  constructor(db: Database, saveFn: () => void) {
    this._db = db;
    this._saveFn = saveFn;
    this._initMetaTable();
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  private _initMetaTable(): void {
    this._db.run(`
      CREATE TABLE IF NOT EXISTS _plugin_tables (
        table_name TEXT PRIMARY KEY,
        plugin_name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }

  // ── 表管理 ────────────────────────────────────────────────────────────────

  createTable(tableName: string, columns: string[]): void {
    this._validateIdentifier(tableName);

    const columnDefs = columns.map((col) => {
      this._validateIdentifier(col);
      return `${col} TEXT`;
    }).join(", ");

    this._db.run(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${columnDefs},
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    this._saveFn();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  insert(tableName: string, data: Record<string, unknown>): void {
    this._validateIdentifier(tableName);

    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.join(", ");
    const values = keys.map((k) => data[k] ?? null);

    this._db.run(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`, values);
    this._saveFn();
  }

  query(
    tableName: string,
    params?: Record<string, unknown>,
    options?: { limit?: number; offset?: number },
  ): Record<string, unknown>[] {
    this._validateIdentifier(tableName);

    let sql = `SELECT * FROM ${tableName}`;
    const bindings: unknown[] = [];

    if (params && Object.keys(params).length > 0) {
      const conditions = Object.entries(params).map(([key, value]) => {
        this._validateIdentifier(key);
        bindings.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY id DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      bindings.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET ?`;
      bindings.push(options.offset);
    }

    const stmt = this._db.prepare(sql);
    stmt.bind(bindings);

    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  delete(tableName: string, params?: Record<string, unknown>): number {
    this._validateIdentifier(tableName);

    let sql = `DELETE FROM ${tableName}`;
    const bindings: unknown[] = [];

    if (params && Object.keys(params).length > 0) {
      const conditions = Object.entries(params).map(([key, value]) => {
        this._validateIdentifier(key);
        bindings.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    this._db.run(sql, bindings);
    const changes = this._db.getRowsModified();
    this._saveFn();
    return changes;
  }

  // ── 插件表管理 ────────────────────────────────────────────────────────────

  getPluginTables(pluginName: string): string[] {
    const stmt = this._db.prepare(`SELECT table_name FROM _plugin_tables WHERE plugin_name = ?`);
    stmt.bind([pluginName]);

    const results: string[] = [];
    while (stmt.step()) {
      results.push((stmt.getAsObject() as { table_name: string }).table_name);
    }
    stmt.free();

    return results;
  }

  dropPluginTables(pluginName: string): void {
    const tables = this.getPluginTables(pluginName);

    for (const table of tables) {
      this._db.run(`DROP TABLE IF EXISTS ${table}`);
    }
    this._db.run(`DELETE FROM _plugin_tables WHERE plugin_name = ?`, [pluginName]);
    this._saveFn();
  }

  // ── 关闭 ──────────────────────────────────────────────────────────────────

  close(): void {
    this._saveFn();
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _validateIdentifier(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`无效的标识符: ${name}`);
    }
  }
}
