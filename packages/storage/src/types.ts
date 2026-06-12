import type { LogLevel } from "@myfinal/dian-shared";

// ---------------------------------------------------------------------------
// 日志存储
// ---------------------------------------------------------------------------

export interface LogEntry {
  id?: number;
  botId: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  createdAt?: number;
}

export interface LogQueryParams {
  botId?: string;
  level?: LogLevel;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface LogRepository {
  write(entry: LogEntry): void;
  query(params?: LogQueryParams): LogEntry[];
  cleanup(retentionDays: number): number;
  close(): void;
}

// ---------------------------------------------------------------------------
// 消息存储
// ---------------------------------------------------------------------------

export interface MessageEntry {
  eventId: string;
  botId: string;
  subtype: string;
  groupId?: string;
  userId?: string;
  senderName?: string;
  messageId?: string;
  text?: string;
  timestamp: number;
}

export interface MessageQueryParams {
  botId?: string;
  groupId?: string;
  userId?: string;
  subtype?: string;
  keyword?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface MessagePage {
  total: number;
  items: MessageEntry[];
}

export interface StatsFilter {
  botId?: string;
  groupId?: string;
  from?: number;
  to?: number;
}

export interface GroupStat {
  groupId: string;
  count: number;
}

export interface UserStat {
  userId: string;
  senderName?: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface OverviewStats {
  total: number;
  groups: number;
  users: number;
  byBot: { botId: string; count: number }[];
}

export interface GroupNameEntry {
  groupId: string;
  name: string;
  updatedAt: number;
}

export interface MessageRepository {
  writeMessage(entry: MessageEntry): void;
  queryMessages(params?: MessageQueryParams): MessagePage;
  overviewStats(filter?: StatsFilter): OverviewStats;
  groupStats(filter?: StatsFilter): GroupStat[];
  userStats(filter?: StatsFilter): UserStat[];
  trendStats(filter?: StatsFilter): TrendPoint[];
  getGroupNames(groupIds?: string[]): GroupNameEntry[];
  upsertGroupNames(entries: GroupNameEntry[]): void;
  close(): void;
}

// ---------------------------------------------------------------------------
// 插件存储
// ---------------------------------------------------------------------------

export interface PluginStore {
  createTable(tableName: string, columns: string[]): void;
  insert(tableName: string, data: Record<string, unknown>): void;
  query(tableName: string, params?: Record<string, unknown>, options?: { limit?: number; offset?: number }): Record<string, unknown>[];
  delete(tableName: string, params?: Record<string, unknown>): number;
  getPluginTables(pluginName: string): string[];
  dropPluginTables(pluginName: string): void;
  close(): void;
}

// ---------------------------------------------------------------------------
// 存储配置
// ---------------------------------------------------------------------------

export interface StorageOptions {
  /** SQLite 数据库文件路径 */
  sqlite?: string;
}
