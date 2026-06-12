// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/**
 * 事件映射类型
 * Key: 事件名
 * Value: 事件参数数组
 */
export type EventMap = Record<string, unknown[]>;

/**
 * 监听器选项
 */
export interface ListenerOptions {
  /** 优先级，数字越小越先执行，默认 100 */
  priority?: number;
  /** 是否阻止后续监听器执行 */
  stopPropagation?: boolean;
}

/**
 * 事件监听器函数
 */
export type EventListener<T extends unknown[]> = (...args: T) => void | Promise<void>;

/**
 * 中间件事件上下文
 */
export interface MiddlewareContext<T extends EventMap, K extends keyof T = keyof T> {
  /** 事件名 */
  type: K;
  /** 事件参数 */
  args: T[K];
  /** 阻止后续传播 */
  stopPropagation: () => void;
}

/**
 * 中间件函数
 */
export type Middleware<T extends EventMap> = (
  ctx: MiddlewareContext<T>,
  next: () => Promise<void>,
) => Promise<void>;

/**
 * 内部监听器包装
 */
export interface ListenerEntry<T extends unknown[]> {
  listener: EventListener<T>;
  options: Required<ListenerOptions>;
  once: boolean;
}

// ---------------------------------------------------------------------------
// Pro 功能类型
// ---------------------------------------------------------------------------

/**
 * waitFor 选项
 */
export interface WaitForOptions {
  /** 超时时间（毫秒），默认 5000 */
  timeout?: number;
  /** 过滤函数，返回 true 才接收 */
  filter?: (...args: unknown[]) => boolean;
}

/**
 * 事件历史记录
 */
export interface EventHistoryEntry<T extends EventMap, K extends keyof T = keyof T> {
  /** 事件名 */
  type: K;
  /** 事件参数 */
  args: T[K];
  /** 时间戳 */
  timestamp: number;
}

/**
 * 事件历史配置
 */
export interface EventHistoryConfig {
  /** 最大记录数量，默认 100 */
  maxSize?: number;
  /** 是否启用，默认 false */
  enabled?: boolean;
}

/**
 * 去重配置
 */
export interface DedupeConfig {
  /** 是否启用，默认 false */
  enabled?: boolean;
  /** 去重字段提取函数，返回用于去重的 key */
  keyExtractor?: (...args: unknown[]) => string;
  /** 去重窗口（毫秒），默认 1000 */
  windowMs?: number;
}
