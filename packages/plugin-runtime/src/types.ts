import "reflect-metadata";
import type { BotEvent } from "@myfinal/dian-shared";
import type { ChildLogger } from "@myfinal/dian-logger";
import type { MiddlewareEventBus } from "@myfinal/dian-event-bus";

// ---------------------------------------------------------------------------
// 元数据 Key
// ---------------------------------------------------------------------------

export const PLUGIN_META_KEY = Symbol.for("dian:plugin");
export const HANDLER_META_KEY = Symbol.for("dian:handler");
export const INTERCEPTOR_META_KEY = Symbol.for("dian:interceptor");

// ---------------------------------------------------------------------------
// 插件权限
// ---------------------------------------------------------------------------

export type PluginPermission =
  | "sendAction"     // 发送动作
  | "reply"          // 回复消息
  | "store"          // 访问存储
  | "config"         // 读取配置
  | "events"         // 访问事件总线
  | "http"           // HTTP 请求
  | "filesystem";    // 文件系统

export interface PluginPermissions {
  /** 允许的权限列表 */
  allowed: PluginPermission[];
  /** 拒绝的权限列表（优先级高于 allowed） */
  denied?: PluginPermission[];
}

// ---------------------------------------------------------------------------
// 插件元数据
// ---------------------------------------------------------------------------

export interface PluginMeta {
  /** 插件名称（唯一） */
  name: string;
  /** 插件描述 */
  description?: string;
  /** 插件版本 */
  version?: string;
  /** 作者 */
  author?: string;
  /** 图标 */
  icon?: string;
  /** 依赖的其他插件 */
  dependencies?: string[];
  /** 所需权限 */
  permissions?: PluginPermission[];
  /** 最低依赖版本 */
  minDeps?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 装饰器选项
// ---------------------------------------------------------------------------

export type Pattern = RegExp | string | (() => RegExp | string);

export interface HandlerMeta {
  method: string;
  pattern: Pattern;
}

export interface InterceptorMeta {
  method: string;
  priority: number;
}

// ---------------------------------------------------------------------------
// 事件上下文（带权限控制）
// ---------------------------------------------------------------------------

export interface EventContext {
  /** 原始事件 */
  event: BotEvent;
  /** 插件名称 */
  pluginName: string;
  /** 停止传播 */
  stopPropagation(): void;
  /** 回复消息（需要 reply 权限） */
  reply(text: string): Promise<void>;
  /** 发送动作（需要 sendAction 权限） */
  sendAction(action: string, params?: Record<string, unknown>): Promise<unknown>;
  /** 检查权限 */
  hasPermission(permission: PluginPermission): boolean;
}

// ---------------------------------------------------------------------------
// 插件沙箱
// ---------------------------------------------------------------------------

export interface PluginSandbox {
  /** 插件名称 */
  name: string;
  /** 插件配置（只读） */
  config: Readonly<unknown>;
  /** 日志器 */
  logger: ChildLogger;
  /** 事件总线（只允许监听，不允许发射） */
  events: {
    on: MiddlewareEventBus<Record<string, unknown[]>>["on"];
    off: MiddlewareEventBus<Record<string, unknown[]>>["off"];
  };
}

// ---------------------------------------------------------------------------
// 插件实例
// ---------------------------------------------------------------------------

export interface PluginInstance {
  /** 插件元数据 */
  meta: PluginMeta;
  /** 类实例 */
  instance: unknown;
  /** 处理器列表 */
  handlers: HandlerMeta[];
  /** 拦截器列表 */
  interceptors: InterceptorMeta[];
  /** 文件路径 */
  filePath: string;
  /** 是否启用 */
  enabled: boolean;
  /** 沙箱 */
  sandbox?: PluginSandbox;
  /** 加载时间 */
  loadedAt?: number;
}

// ---------------------------------------------------------------------------
// 插件定义（函数式）
// ---------------------------------------------------------------------------

export interface PluginDefinition<TConfig = unknown> {
  /** 插件元数据 */
  meta: PluginMeta;
  /** 处理器 */
  handlers?: PluginHandler[];
  /** 拦截器 */
  interceptors?: PluginInterceptor[];
  /** 启动钩子 */
  onSetup?: (ctx: PluginSetupContext<TConfig>) => Promise<void>;
  /** 停止钩子 */
  onStop?: () => Promise<void>;
}

export interface PluginHandler {
  /** 匹配模式 */
  pattern: Pattern;
  /** 处理函数 */
  handler: (ctx: EventContext) => Promise<void> | void;
  /** 优先级 */
  priority?: number;
}

export interface PluginInterceptor {
  /** 优先级 */
  priority: number;
  /** 拦截函数 */
  interceptor: (ctx: EventContext) => Promise<void> | void;
}

export interface PluginSetupContext<TConfig = unknown> {
  /** 插件配置 */
  config: TConfig;
  /** 日志器 */
  logger: ChildLogger;
  /** 事件总线 */
  events: MiddlewareEventBus<Record<string, unknown[]>>;
}

// ---------------------------------------------------------------------------
// 依赖检查结果
// ---------------------------------------------------------------------------

export interface DependencyCheckResult {
  /** 是否通过 */
  ok: boolean;
  /** 缺失的依赖 */
  missing: string[];
  /** 版本不满足的依赖 */
  versionMismatch: { name: string; required: string; actual: string }[];
}
