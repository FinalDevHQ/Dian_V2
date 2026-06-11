import type { Logger, ChildLogger } from "@myfinal/dian-logger";
import type { MiddlewareEventBus } from "@myfinal/dian-event-bus";

// ---------------------------------------------------------------------------
// 模块状态
// ---------------------------------------------------------------------------

export type ModuleStatus =
  | "pending"    // 未启动
  | "starting"   // 启动中
  | "running"    // 运行中
  | "stopping"   // 停止中
  | "stopped"    // 已停止
  | "error";     // 启动/运行出错

// ---------------------------------------------------------------------------
// 模块上下文
// ---------------------------------------------------------------------------

/**
 * 模块上下文，注入到模块的生命周期方法中
 */
export interface ModuleContext<TConfig = unknown> {
  /** 模块名称 */
  name: string;
  /** 模块配置（从 bot.yaml 的 options 中获取） */
  config: TConfig;
  /** 日志器 */
  logger: ChildLogger;
  /** 事件总线 */
  events: MiddlewareEventBus<Record<string, unknown[]>>;
  /** 依赖的其他模块 */
  dependencies: Map<string, ModuleInstance>;
  /** 获取其他模块的实例 */
  getModule<T extends ModuleInstance = ModuleInstance>(name: string): T | undefined;
}

// ---------------------------------------------------------------------------
// 类型守卫
// ---------------------------------------------------------------------------

/**
 * 检查一个值是否符合 Module 接口
 */
export function isModule(val: unknown): val is Module {
  return (
    typeof val === "object" &&
    val !== null &&
    "name" in val &&
    typeof (val as Module).name === "string" &&
    "setup" in val &&
    typeof (val as Module).setup === "function" &&
    "teardown" in val &&
    typeof (val as Module).teardown === "function"
  );
}

// ---------------------------------------------------------------------------
// 模块定义
// ---------------------------------------------------------------------------

/**
 * 模块定义接口
 * 开发者实现此接口来创建模块
 */
export interface Module<TConfig = unknown> {
  /** 模块名称（唯一标识） */
  readonly name: string;
  /** 模块描述 */
  readonly description?: string;
  /** 依赖的其他模块名称 */
  readonly dependencies?: string[];
  /** 模块版本 */
  readonly version?: string;

  /**
   * 启动模块
   */
  setup(ctx: ModuleContext<TConfig>): Promise<void>;

  /**
   * 停止模块
   */
  teardown(ctx: ModuleContext<TConfig>): Promise<void>;

  /**
   * 模块就绪后的回调（可选）
   */
  onReady?(ctx: ModuleContext<TConfig>): Promise<void>;

  /**
   * 配置变更时的回调（可选）
   */
  onConfigChange?(ctx: ModuleContext<TConfig>, newConfig: TConfig): Promise<void>;

  /**
   * 健康检查（可选）
   * 返回 true 表示健康，false 或抛出异常表示不健康
   */
  healthCheck?(ctx: ModuleContext<TConfig>): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// 模块实例
// ---------------------------------------------------------------------------

/**
 * 已注册的模块实例
 */
export interface ModuleInstance {
  /** 模块定义 */
  module: Module;
  /** 当前状态 */
  status: ModuleStatus;
  /** 启动时间 */
  startedAt?: number;
  /** 错误信息 */
  error?: Error;
}

// ---------------------------------------------------------------------------
// 模块管理器配置
// ---------------------------------------------------------------------------

/**
 * 模块管理器配置
 */
export interface ModuleManagerConfig {
  /** 模块目录路径 */
  modulesDir?: string;
  /** 启动超时时间（毫秒），默认 30000 */
  startupTimeout?: number;
  /** 是否启用健康检查，默认 false */
  healthCheck?: boolean;
  /** 健康检查间隔（毫秒），默认 60000 */
  healthCheckInterval?: number;
}
