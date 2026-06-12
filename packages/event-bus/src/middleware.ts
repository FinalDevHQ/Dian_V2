import { EventEmitter } from "./emitter.js";
import type { EventMap, Middleware, MiddlewareContext, EventHistoryConfig, DedupeConfig } from "./types.js";

// ---------------------------------------------------------------------------
// MiddlewareEventBus - 支持中间件的事件总线
// ---------------------------------------------------------------------------

export class MiddlewareEventBus<T extends EventMap> extends EventEmitter<T> {
  private _middlewares: Middleware<T>[] = [];

  constructor(options?: {
    history?: EventHistoryConfig;
    dedupe?: DedupeConfig;
  }) {
    super(options);
  }

  // ── 中间件注册 ────────────────────────────────────────────────────────────

  /**
   * 注册中间件
   *
   * @example
   * bus.use(async (ctx, next) => {
   *   console.log("before:", ctx.type);
   *   await next();
   *   console.log("after:", ctx.type);
   * });
   */
  use(middleware: Middleware<T>): () => void {
    this._middlewares.push(middleware);

    // 返回移除函数
    return () => {
      const index = this._middlewares.indexOf(middleware);
      if (index !== -1) this._middlewares.splice(index, 1);
    };
  }

  // ── 发射事件（带中间件）────────────────────────────────────────────────────

  /**
   * 发射事件，依次执行中间件和监听器
   */
  override async emit<K extends keyof T & string>(event: K, ...args: T[K]): Promise<void> {
    if (this._middlewares.length === 0) {
      return super.emit(event, ...args);
    }

    let stopped = false;
    const ctx: MiddlewareContext<T, K> = {
      type: event,
      args,
      stopPropagation: () => {
        stopped = true;
      },
    };

    // 构建中间件链
    const chain = this._buildMiddlewareChain(0, ctx, () => super.emit(event, ...args));

    await chain();

    // 如果中间件阻止了传播，不执行监听器
    if (stopped) return;
  }

  // ── 清理 ──────────────────────────────────────────────────────────────────

  /**
   * 清理所有中间件和监听器
   */
  override clear(): void {
    super.clear();
    this._middlewares = [];
  }

  /**
   * 清理所有中间件
   */
  clearMiddlewares(): void {
    this._middlewares = [];
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _buildMiddlewareChain(
    index: number,
    ctx: MiddlewareContext<T>,
    finalHandler: () => Promise<void>,
  ): () => Promise<void> {
    if (index >= this._middlewares.length) {
      return finalHandler;
    }

    const middleware = this._middlewares[index];
    const next = this._buildMiddlewareChain(index + 1, ctx, finalHandler);

    return async () => {
      await middleware(ctx, next);
    };
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建事件总线
 *
 * @example
 * interface AppEvents {
 *   message: [string];
 *   error: [Error];
 * }
 *
 * const bus = createEventBus<AppEvents>();
 * bus.on("message", (msg) => console.log(msg));
 * bus.emit("message", "hello");
 */
export function createEventBus<T extends EventMap>(options?: {
  history?: EventHistoryConfig;
  dedupe?: DedupeConfig;
}): MiddlewareEventBus<T> {
  return new MiddlewareEventBus<T>(options);
}
