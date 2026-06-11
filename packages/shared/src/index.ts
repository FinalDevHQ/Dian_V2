// @myfinal/dian-shared - 平台无关的共享类型与工具

// 品牌类型（ID 类型安全）
export {
  BotId,
  UserId,
  GroupId,
  ChannelId,
  MessageId,
  EventId,
} from "./events.js";

// 事件类型
export type {
  Platform,
  BotEventType,
  MessageType,
  SenderRole,
  Sender,
  BotEvent,
  EventPayload,
} from "./events.js";

// 消息类型
export type {
  MessageSegment,
  MessageContent,
} from "./message.js";

// 通用类型
export type {
  ActionResult,
  SendActionFn,
  LogLevel,
  AsyncFn,
  Mutable,
  DeepPartial,
  Awaited,
} from "./types.js";
