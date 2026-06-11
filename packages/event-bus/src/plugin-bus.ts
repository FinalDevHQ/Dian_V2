import { MiddlewareEventBus } from "./middleware.js";
import type { EventMap, Middleware } from "./types.js";

// ---------------------------------------------------------------------------
// PluginEventBus - 插件作用域的事件总线
// ---------------------------------------------------------------------------

/**
 * 插件作用域的事件总线
 * 插件卸载时可自动清理所有注册的监听器和中间件
 */
export class PluginEventBus<T extends EventMap> extends MiddlewareEventBus<T> {
  private _pluginId: string;
  private _cleanupFns: (() => void)[] = [];

  constructor(pluginId: string) {
    super();
    this._pluginId = pluginId;
  }

  /** 获取插件 ID */
  get pluginId(): string {
    return this._pluginId;
  }

  // ── 带追踪的注册 ──────────────────────────────────────────────────────────

  /**
   * 注册监听器（自动追踪，插件卸载时可清理）
   */
  override on<K extends keyof T & string>(
    event: K,
    listener: (...args: T[K]) => void | Promise<void>,
    options?: { priority?: number; stopPropagation?: boolean },
  ): () => void {
    const unsub = super.on(event, listener, options);
    this._cleanupFns.push(unsub);
    return unsub;
  }

  /**
   * 注册一次性监听器（自动追踪）
   */
  override once<K extends keyof T & string>(
    event: K,
    listener: (...args: T[K]) => void | Promise<void>,
    options?: { priority?: number; stopPropagation?: boolean },
  ): () => void {
    const unsub = super.once(event, listener, options);
    this._cleanupFns.push(unsub);
    return unsub;
  }

  /**
   * 注册中间件（自动追踪）
   */
  override use(middleware: Middleware<T>): () => void {
    const unsub = super.use(middleware);
    this._cleanupFns.push(unsub);
    return unsub;
  }

  // ── 插件卸载清理 ──────────────────────────────────────────────────────────

  /**
   * 清理插件注册的所有监听器和中间件
   * 插件卸载时调用
   */
  dispose(): void {
    for (const fn of this._cleanupFns) {
      fn();
    }
    this._cleanupFns = [];
    this.clear();
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建插件作用域的事件总线
 *
 * @example
 * const bus = createPluginBus<AppEvents>("my-plugin");
 *
 * // 注册监听器
 * bus.on("message", handler);
 *
 * // 插件卸载时清理
 * bus.dispose();
 */
export function createPluginBus<T extends EventMap>(pluginId: string): PluginEventBus<T> {
  return new PluginEventBus<T>(pluginId);
}
