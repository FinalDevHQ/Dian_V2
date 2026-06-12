// ---------------------------------------------------------------------------
// 通用类型定义
// ---------------------------------------------------------------------------

import type { MessageSegment } from "./message.js";

/**
 * Action 调用结果（HTTP/WS 发送动作的返回）
 */
export interface ActionResult<TData = unknown> {
  /** 是否成功 */
  ok: boolean;
  /** 状态：ok = 成功，failed = 业务失败，timeout = 超时 */
  status: "ok" | "failed" | "timeout";
  /** 返回码（非 0 时代表失败） */
  retcode?: number;
  /** 错误描述 */
  message?: string;
  /** 成功时的返回数据 */
  data?: TData;
}

/**
 * 通用 action 发送函数类型
 * 插件通过此函数调用底层 API（OneBot/飞书等），无需关心具体实现
 */
export type SendActionFn = (
  action: string,
  params?: Record<string, unknown>
) => Promise<ActionResult>;

/**
 * 日志级别
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * 可暂停的异步函数
 */
export type AsyncFn<T = void> = () => Promise<T>;

/**
 * 移除只读修饰符
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * 深度 Partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 提取 Promise 内部类型
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
