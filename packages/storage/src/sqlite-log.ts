import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { LogEntry, LogQueryParams, LogRepository } from "./types.js";

// ---------------------------------------------------------------------------
// SqliteLogRepository
// ---------------------------------------------------------------------------

export class SqliteLogRepository implements LogRepository {
  private _db: Database;
  private _dbPath: string;

  constructor(db: Database, dbPath: string) {
    this._db = db;
    this._dbPath = dbPath;
    this._initTable();
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  private _initTable(): void {
    this._db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        meta TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_logs_bot_id ON logs(bot_id)`);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)`);
  }

  // ── 写入 ──────────────────────────────────────────────────────────────────

  write(entry: LogEntry): void {
    this._db.run(
      `INSERT INTO logs (bot_id, level, message, meta, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        entry.botId,
        entry.level,
        entry.message,
        entry.meta ? JSON.stringify(entry.meta) : null,
        entry.createdAt ?? Math.floor(Date.now() / 1000),
      ],
    );
    this._save();
  }

  // ── 查询 ──────────────────────────────────────────────────────────────────

  query(params?: LogQueryParams): LogEntry[] {
    const { sql, bindings } = this._buildQuery(params);

    const stmt = this._db.prepare(sql);
    stmt.bind(bindings);

    const results: LogEntry[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this._mapRow(row));
    }
    stmt.free();

    return results;
  }

  // ── 清理 ──────────────────────────────────────────────────────────────────

  cleanup(retentionDays: number): number {
    const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
    this._db.run(`DELETE FROM logs WHERE created_at < ?`, [cutoff]);
    const changes = this._db.getRowsModified();
    this._save();
    return changes;
  }

  // ── 关闭 ──────────────────────────────────────────────────────────────────

  close(): void {
    this._save();
    this._db.close();
  }

  // ── 保存到磁盘 ────────────────────────────────────────────────────────────

  private _save(): void {
    const data = this._db.export();
    writeFileSync(this._dbPath, Buffer.from(data));
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _buildQuery(params?: LogQueryParams): {
    sql: string;
    bindings: unknown[];
  } {
    const conditions: string[] = ["1=1"];
    const bindings: unknown[] = [];

    if (params?.botId) {
      conditions.push("bot_id = ?");
      bindings.push(params.botId);
    }

    if (params?.level) {
      conditions.push("level = ?");
      bindings.push(params.level);
    }

    if (params?.from) {
      conditions.push("created_at >= ?");
      bindings.push(params.from);
    }

    if (params?.to) {
      conditions.push("created_at <= ?");
      bindings.push(params.to);
    }

    const limit = params?.limit ?? 100;
    const offset = params?.offset ?? 0;

    const sql = `
      SELECT * FROM logs
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    bindings.push(limit, offset);

    return { sql, bindings };
  }

  private _mapRow(row: Record<string, unknown>): LogEntry {
    return {
      id: row.id as number,
      botId: row.bot_id as string,
      level: row.level as LogEntry["level"],
      message: row.message as string,
      meta: row.meta ? JSON.parse(row.meta as string) : undefined,
      createdAt: row.created_at as number,
    };
  }
}
