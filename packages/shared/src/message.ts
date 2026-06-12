// ---------------------------------------------------------------------------
// 消息段定义
// ---------------------------------------------------------------------------

/**
 * 消息段，各平台适配器自行定义具体类型
 * 这里只保留基础结构
 */
export interface MessageSegment {
  /** 段类型，如 text / image / at */
  type: string;
  /** 段数据 */
  data: Record<string, unknown>;
}

/**
 * 消息内容，可以是纯文本或消息段数组
 */
export type MessageContent = string | MessageSegment[];
