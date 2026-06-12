// ---------------------------------------------------------------------------
// 任务状态
// ---------------------------------------------------------------------------

export type TaskStatus = "pending" | "running" | "paused" | "completed" | "failed";

// ---------------------------------------------------------------------------
// 任务定义
// ---------------------------------------------------------------------------

export interface TaskOptions {
  /** 任务名称（唯一） */
  name: string;
  /** 所属插件 */
  plugin: string;
  /** Cron 表达式（与 interval 二选一） */
  cron?: string;
  /** 间隔毫秒数（与 cron 二选一） */
  interval?: number;
  /** 延迟毫秒数（一次性任务） */
  delay?: number;
  /** 是否立即执行一次 */
  immediate?: boolean;
  /** 任务处理函数 */
  handler: () => Promise<void> | void;
  /** 描述 */
  description?: string;
}

export interface TaskInstance {
  /** 任务 ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 所属插件 */
  plugin: string;
  /** Cron 表达式 */
  cron?: string;
  /** 间隔毫秒数 */
  interval?: number;
  /** 延迟毫秒数 */
  delay?: number;
  /** 描述 */
  description?: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 创建时间 */
  createdAt: number;
  /** 上次执行时间 */
  lastRunAt?: number;
  /** 下次执行时间 */
  nextRunAt?: number;
  /** 执行次数 */
  runCount: number;
  /** 最后一次错误 */
  lastError?: string;
}

// ---------------------------------------------------------------------------
// Cron 解析结果
// ---------------------------------------------------------------------------

export interface CronFields {
  second: number[];
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}
