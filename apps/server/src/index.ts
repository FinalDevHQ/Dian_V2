// @dian/server - Dian V2 应用入口

export { DianServer, createServer } from "./server.js";

// 重新导出所有包的核心类型
export type {
  BotEvent,
  EventPayload,
  UserId,
  GroupId,
  MessageId,
} from "@myfinal/dian-shared";

export type {
  LogLevel,
} from "@myfinal/dian-logger";

export type {
  Settings,
  BotEntry,
  AllConfig,
} from "@myfinal/dian-config";

export type {
  EventMap,
} from "@myfinal/dian-event-bus";

export type {
  Module,
  ModuleContext,
} from "@myfinal/dian-module-runtime";

export type {
  PluginMeta,
  EventContext,
} from "@myfinal/dian-plugin-runtime";

export type {
  StorageOptions,
} from "@myfinal/dian-storage";
