import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import yaml from "js-yaml";
import { z, type ZodSchema } from "zod";
import {
  SettingsSchema,
  BotConfigSchema,
  TemplatesSchema,
  CONFIG_FILES,
  type AllConfig,
  type ConfigFileName,
} from "./schema.js";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface LoaderOptions {
  /** 配置目录路径，默认 "config" */
  configDir?: string;
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/**
 * 确保目录存在
 */
function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 确保配置文件存在，不存在则创建默认文件
 */
function ensureConfigFile(filePath: string, defaultContent: string): void {
  if (!existsSync(filePath)) {
    ensureDir(filePath);
    writeFileSync(filePath, defaultContent, "utf-8");
  }
}

/**
 * 加载并校验单个 YAML 配置文件
 * 返回 Zod 输出类型（defaults 已应用）
 */
function loadYaml<T extends ZodSchema>(filePath: string, schema: T): z.infer<T> {
  const content = readFileSync(filePath, "utf-8");
  const raw = yaml.load(content);

  const result = schema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`配置文件校验失败: ${filePath}\n${errors}`);
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// 默认配置
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = `# Dian V2 配置
logLevel: info

storage: {}
  # sqlite: data/dian.db
  # mysql: mysql://user:pass@localhost:3306/dian
  # redis: redis://localhost:6379

auth: {}
  # passwordHash: (留空则自动生成)
  # jwtSecret: (留空则自动生成)
  # tokenExpiresIn: 86400
`;

const DEFAULT_BOT = `# 机器人配置
# 支持多种平台的多个机器人同时运行
# platform 和 options 的具体结构由各平台适配器插件定义
bots: []
# 示例（同时运行多个不同平台的机器人）:
# bots:
#   - botId: qq-bot
#     enabled: true
#     platform: onebot
#     options:
#       # OneBot 适配器定义的配置
#   - botId: discord-bot
#     enabled: true
#     platform: discord
#     options:
#       # Discord 适配器定义的配置
#   - botId: telegram-bot
#     enabled: true
#     platform: telegram
#     options:
#       # Telegram 适配器定义的配置
`;

const DEFAULT_TEMPLATES = `# 消息模板（由插件定义和使用）
templates: {}
`;

const DEFAULTS: Record<ConfigFileName, string> = {
  settings: DEFAULT_SETTINGS,
  bot: DEFAULT_BOT,
  templates: DEFAULT_TEMPLATES,
};

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/**
 * 加载所有配置文件
 */
export function loadAllConfig(options?: LoaderOptions): AllConfig {
  const configDir = resolve(options?.configDir ?? "config");

  // 确保配置文件存在
  for (const [name, filename] of Object.entries(CONFIG_FILES)) {
    const filePath = resolve(configDir, filename);
    ensureConfigFile(filePath, DEFAULTS[name as ConfigFileName]);
  }

  // 加载并校验
  const settings = loadYaml(
    resolve(configDir, CONFIG_FILES.settings),
    SettingsSchema,
  );

  const bot = loadYaml(
    resolve(configDir, CONFIG_FILES.bot),
    BotConfigSchema,
  );

  const templates = loadYaml(
    resolve(configDir, CONFIG_FILES.templates),
    TemplatesSchema,
  );

  return { settings, bot, templates };
}

export type { AllConfig };
