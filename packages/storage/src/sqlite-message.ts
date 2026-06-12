import { type Database } from "sql.js";
import type {
  MessageEntry,
  MessageQueryParams,
  MessagePage,
  MessageRepository,
  StatsFilter,
  GroupStat,
  UserStat,
  TrendPoint,
  OverviewStats,
  GroupNameEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// SqliteMessageRepository
// ---------------------------------------------------------------------------

export class SqliteMessageRepository implements MessageRepository {
  private _db: Database;
  private _dbPath: string;
  private _saveFn: () => void;

  constructor(db: Database, dbPath: string, saveFn: () => void) {
    this._db = db;
    this._dbPath = dbPath;
    this._saveFn = saveFn;
    this._initTable();
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  private _initTable(): void {
    this._db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE NOT NULL,
        bot_id TEXT NOT NULL,
        subtype TEXT NOT NULL,
        group_id TEXT,
        user_id TEXT,
        sender_name TEXT,
        message_id TEXT,
        text TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_messages_bot_id ON messages(bot_id)`);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)`);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`);
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS group_names (
        group_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  // ── 写入 ──────────────────────────────────────────────────────────────────

  writeMessage(entry: MessageEntry): void {
    this._db.run(
      `INSERT OR IGNORE INTO messages (event_id, bot_id, subtype, group_id, user_id, sender_name, message_id, text, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.eventId,
        entry.botId,
        entry.subtype,
        entry.groupId ?? null,
        entry.userId ?? null,
        entry.senderName ?? null,
        entry.messageId ?? null,
        entry.text ?? null,
        entry.timestamp,
      ],
    );
    this._saveFn();
  }

  // ── 查询 ──────────────────────────────────────────────────────────────────

  queryMessages(params?: MessageQueryParams): MessagePage {
    const countQuery = this._buildCountQuery(params);
    const countStmt = this._db.prepare(countQuery.sql);
    countStmt.bind(countQuery.bindings);
    countStmt.step();
    const total = (countStmt.getAsObject() as { total: number }).total;
    countStmt.free();

    const { sql, bindings } = this._buildQuery(params);
    const stmt = this._db.prepare(sql);
    stmt.bind(bindings);

    const items: MessageEntry[] = [];
    while (stmt.step()) {
      items.push(this._mapRow(stmt.getAsObject()));
    }
    stmt.free();

    return { total, items };
  }

  // ── 统计 ──────────────────────────────────────────────────────────────────

  overviewStats(filter?: StatsFilter): OverviewStats {
    const { where, bindings } = this._buildStatsWhere(filter);

    const total = this._queryScalar(`SELECT COUNT(*) as count FROM messages ${where}`, bindings) ?? 0;
    const groups = this._queryScalar(`SELECT COUNT(DISTINCT group_id) as count FROM messages ${where} AND group_id IS NOT NULL`, bindings) ?? 0;
    const users = this._queryScalar(`SELECT COUNT(DISTINCT user_id) as count FROM messages ${where} AND user_id IS NOT NULL`, bindings) ?? 0;

    const byBotStmt = this._db.prepare(`SELECT bot_id as botId, COUNT(*) as count FROM messages ${where} GROUP BY bot_id`);
    byBotStmt.bind(bindings);
    const byBot: { botId: string; count: number }[] = [];
    while (byBotStmt.step()) {
      byBot.push(byBotStmt.getAsObject() as { botId: string; count: number });
    }
    byBotStmt.free();

    return { total, groups, users, byBot };
  }

  groupStats(filter?: StatsFilter): GroupStat[] {
    const { where, bindings } = this._buildStatsWhere(filter);

    const stmt = this._db.prepare(`
      SELECT group_id as groupId, COUNT(*) as count
      FROM messages ${where} AND group_id IS NOT NULL
      GROUP BY group_id ORDER BY count DESC
    `);
    stmt.bind(bindings);

    const results: GroupStat[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as GroupStat);
    }
    stmt.free();

    return results;
  }

  userStats(filter?: StatsFilter): UserStat[] {
    const { where, bindings } = this._buildStatsWhere(filter);

    const stmt = this._db.prepare(`
      SELECT user_id as userId, MAX(sender_name) as senderName, COUNT(*) as count
      FROM messages ${where} AND user_id IS NOT NULL
      GROUP BY user_id ORDER BY count DESC
    `);
    stmt.bind(bindings);

    const results: UserStat[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as UserStat);
    }
    stmt.free();

    return results;
  }

  trendStats(filter?: StatsFilter): TrendPoint[] {
    const { where, bindings } = this._buildStatsWhere(filter);

    const stmt = this._db.prepare(`
      SELECT date(timestamp, 'unixepoch') as date, COUNT(*) as count
      FROM messages ${where}
      GROUP BY date ORDER BY date
    `);
    stmt.bind(bindings);

    const results: TrendPoint[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as TrendPoint);
    }
    stmt.free();

    return results;
  }

  // ── 群组名称 ──────────────────────────────────────────────────────────────

  getGroupNames(groupIds?: string[]): GroupNameEntry[] {
    let sql: string;
    let bindings: unknown[] = [];

    if (!groupIds || groupIds.length === 0) {
      sql = `SELECT * FROM group_names`;
    } else {
      const placeholders = groupIds.map(() => "?").join(", ");
      sql = `SELECT * FROM group_names WHERE group_id IN (${placeholders})`;
      bindings = groupIds;
    }

    const stmt = this._db.prepare(sql);
    stmt.bind(bindings);

    const results: GroupNameEntry[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as GroupNameEntry);
    }
    stmt.free();

    return results;
  }

  upsertGroupNames(entries: GroupNameEntry[]): void {
    for (const entry of entries) {
      this._db.run(
        `INSERT INTO group_names (group_id, name, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET name = ?, updated_at = ?`,
        [entry.groupId, entry.name, entry.updatedAt, entry.name, entry.updatedAt],
      );
    }
    this._saveFn();
  }

  // ── 关闭 ──────────────────────────────────────────────────────────────────

  close(): void {
    this._saveFn();
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _queryScalar(sql: string, bindings: unknown[]): number | undefined {
    const stmt = this._db.prepare(sql);
    stmt.bind(bindings);
    const result = stmt.step() ? (stmt.getAsObject() as { count: number }).count : undefined;
    stmt.free();
    return result;
  }

  private _buildQuery(params?: MessageQueryParams): {
    sql: string;
    bindings: unknown[];
  } {
    const { where, bindings } = this._buildWhere(params);
    const limit = Math.min(params?.limit ?? 50, 200);
    const offset = params?.offset ?? 0;

    return {
      sql: `SELECT * FROM messages ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      bindings: [...bindings, limit, offset],
    };
  }

  private _buildCountQuery(params?: MessageQueryParams): {
    sql: string;
    bindings: unknown[];
  } {
    const { where, bindings } = this._buildWhere(params);
    return {
      sql: `SELECT COUNT(*) as total FROM messages ${where}`,
      bindings,
    };
  }

  private _buildWhere(params?: MessageQueryParams): {
    where: string;
    bindings: unknown[];
  } {
    const conditions: string[] = ["1=1"];
    const bindings: unknown[] = [];

    if (params?.botId) {
      conditions.push("bot_id = ?");
      bindings.push(params.botId);
    }

    if (params?.groupId) {
      conditions.push("group_id = ?");
      bindings.push(params.groupId);
    }

    if (params?.userId) {
      conditions.push("user_id = ?");
      bindings.push(params.userId);
    }

    if (params?.subtype) {
      conditions.push("subtype = ?");
      bindings.push(params.subtype);
    }

    if (params?.keyword) {
      conditions.push("text LIKE ?");
      bindings.push(`%${params.keyword}%`);
    }

    if (params?.from) {
      conditions.push("timestamp >= ?");
      bindings.push(params.from);
    }

    if (params?.to) {
      conditions.push("timestamp <= ?");
      bindings.push(params.to);
    }

    return {
      where: `WHERE ${conditions.join(" AND ")}`,
      bindings,
    };
  }

  private _buildStatsWhere(filter?: StatsFilter): {
    where: string;
    bindings: unknown[];
  } {
    const conditions: string[] = ["1=1"];
    const bindings: unknown[] = [];

    if (filter?.botId) {
      conditions.push("bot_id = ?");
      bindings.push(filter.botId);
    }

    if (filter?.groupId) {
      conditions.push("group_id = ?");
      bindings.push(filter.groupId);
    }

    if (filter?.from) {
      conditions.push("timestamp >= ?");
      bindings.push(filter.from);
    }

    if (filter?.to) {
      conditions.push("timestamp <= ?");
      bindings.push(filter.to);
    }

    return {
      where: `WHERE ${conditions.join(" AND ")}`,
      bindings,
    };
  }

  private _mapRow(row: Record<string, unknown>): MessageEntry {
    return {
      eventId: row.event_id as string,
      botId: row.bot_id as string,
      subtype: row.subtype as string,
      groupId: row.group_id as string | undefined,
      userId: row.user_id as string | undefined,
      senderName: row.sender_name as string | undefined,
      messageId: row.message_id as string | undefined,
      text: row.text as string | undefined,
      timestamp: row.timestamp as number,
    };
  }
}
