// ---------------------------------------------------------------------------
// 品牌类型 - 防止 ID 混用
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** 机器人 ID，对应配置中的 botId */
export type BotId = Brand<string, "BotId">;
/** 用户 ID */
export type UserId = Brand<string, "UserId">;
/** 群组 ID */
export type GroupId = Brand<string, "GroupId">;
/** 频道 ID */
export type ChannelId = Brand<string, "ChannelId">;
/** 消息 ID，用于撤回/引用 */
export type MessageId = Brand<string, "MessageId">;
/** 事件 ID，幂等标识 */
export type EventId = Brand<string, "EventId">;

// ---------------------------------------------------------------------------
// 品牌类型构造函数
// ---------------------------------------------------------------------------

export const BotId = (id: string): BotId => id as BotId;
export const UserId = (id: string): UserId => id as UserId;
export const GroupId = (id: string): GroupId => id as GroupId;
export const ChannelId = (id: string): ChannelId => id as ChannelId;
export const MessageId = (id: string): MessageId => id as MessageId;
export const EventId = (id: string): EventId => id as EventId;

// ---------------------------------------------------------------------------
// 统一事件类型（平台无关）
// ---------------------------------------------------------------------------

/**
 * 平台标识，支持多平台扩展
 * 适配器插件负责注册自己的平台标识
 */
export type Platform = string;

/**
 * 事件大类，各平台适配器自行定义映射
 */
export type BotEventType =
  | "message"
  | "message_sent"
  | "notice"
  | "request"
  | "meta_event";

/**
 * 消息类型
 */
export type MessageType = "private" | "group";

/**
 * 发送者角色
 */
export type SenderRole = "owner" | "admin" | "member";

/**
 * 发送者信息
 */
export interface Sender {
  /** 用户 ID */
  userId: UserId;
  /** 昵称 */
  nickname?: string;
  /** 群名片 */
  card?: string;
  /** 角色（群消息可用） */
  role?: SenderRole;
}

/**
 * 统一事件对象
 * 所有上层模块（插件、模块）只与此类型交互，不接触协议原始字段
 */
export interface BotEvent {
  /** 幂等 ID */
  eventId: EventId;
  /** 机器人标识 */
  botId: BotId;
  /** 来源平台 */
  platform: Platform;
  /** 事件大类 */
  type: BotEventType;
  /** 事件子类型，如 message.group / notice.group_increase */
  subtype: string;
  /** 事件时间戳（秒级） */
  timestamp: number;
  /** 结构化载荷 */
  payload: EventPayload;
  /** 原始协议数据，调试或高级用途时使用 */
  raw: unknown;
}

/**
 * 统一事件载荷
 * 从各平台原始结构中抽取公共字段
 */
export interface EventPayload {
  /** 消息文本（message 事件可用） */
  text?: string;
  /** 用户 ID */
  userId?: UserId;
  /** 群组 ID（群消息可用） */
  groupId?: GroupId;
  /** 频道 ID（频道消息可用） */
  channelId?: ChannelId;
  /** 消息 ID（message 事件可用，用于撤回/引用） */
  messageId?: MessageId;
  /** 消息类型 */
  messageType?: MessageType;
  /** 发送者信息 */
  sender?: Sender;
}
