import { z } from "zod";

// ---------------------------------------------------------------------------
// Settings Schema - settings.yaml
// ---------------------------------------------------------------------------

/** 日志级别 */
export const LogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/** 存储配置 */
export const StorageConfigSchema = z.object({
  sqlite: z.string().optional(),
  mysql: z.string().optional(),
  redis: z.string().optional(),
});
export type StorageConfig = z.infer<typeof StorageConfigSchema>;

/** 认证配置 */
export const AuthConfigSchema = z.object({
  passwordHash: z.string().optional(),
  jwtSecret: z.string().optional(),
  tokenExpiresIn: z.number().default(86400),
});
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/** 设置 Schema */
export const SettingsSchema = z.object({
  logLevel: LogLevelSchema.default("info"),
  storage: StorageConfigSchema.default({}),
  auth: AuthConfigSchema.default({}),
  httpsProxy: z.string().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

// ---------------------------------------------------------------------------
// Bot Schema - bot.yaml
// ---------------------------------------------------------------------------

/** 机器人配置入口 */
export const BotEntrySchema = z.object({
  botId: z.string().min(1),
  enabled: z.boolean().default(true),
  platform: z.string().min(1),
  options: z.record(z.unknown()).default({}),
});
export type BotEntry = z.infer<typeof BotEntrySchema>;

/** 机器人配置 */
export const BotConfigSchema = z.object({
  bots: z.array(BotEntrySchema).default([]),
});
export type BotConfig = z.infer<typeof BotConfigSchema>;

// ---------------------------------------------------------------------------
// Templates Schema - templates.yaml
// ---------------------------------------------------------------------------

/** 消息模板配置 */
export const TemplatesSchema = z.object({
  templates: z.record(z.string()).default({}),
});
export type TemplatesConfig = z.infer<typeof TemplatesSchema>;

// ---------------------------------------------------------------------------
// 聚合类型
// ---------------------------------------------------------------------------

/**
 * 所有配置
 * 使用 z.infer 获取解析后的类型（defaults 已应用）
 */
export interface AllConfig {
  settings: z.infer<typeof SettingsSchema>;
  bot: z.infer<typeof BotConfigSchema>;
  templates: z.infer<typeof TemplatesSchema>;
}

/** 配置文件名 */
export type ConfigFileName = "settings" | "bot" | "templates";

/** 配置文件映射 */
export const CONFIG_FILES: Record<ConfigFileName, string> = {
  settings: "settings.yaml",
  bot: "bot.yaml",
  templates: "templates.yaml",
};
