// @myfinal/dian-config - 配置管理模块

// Schema
export {
  LogLevelSchema,
  StorageConfigSchema,
  AuthConfigSchema,
  SettingsSchema,
  BotEntrySchema,
  BotConfigSchema,
  TemplatesSchema,
  CONFIG_FILES,
} from "./schema.js";
export type {
  LogLevel,
  StorageConfig,
  AuthConfig,
  Settings,
  BotEntry,
  BotConfig,
  TemplatesConfig,
  AllConfig,
  ConfigFileName,
} from "./schema.js";

// Loader
export { loadAllConfig } from "./loader.js";
export type { LoaderOptions } from "./loader.js";

// Writer
export { parseYaml, dumpYaml, writeYamlFile } from "./writer.js";

// Service
export { ConfigService, createConfigService } from "./service.js";
export type {
  ConfigServiceEvents,
  ConfigChangeEvent,
  ConfigServiceOptions,
} from "./service.js";
