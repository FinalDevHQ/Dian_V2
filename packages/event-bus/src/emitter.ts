import type {
  EventMap,
  EventListener,
  ListenerOptions,
  ListenerEntry,
  WaitForOptions,
  EventHistoryEntry,
  EventHistoryConfig,
  DedupeConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// EventEmitter - 类型安全的事件发射器（Pro 版）
// ---------------------------------------------------------------------------

export class EventEmitter<T extends EventMap> {
  private _listeners = new Map<string, ListenerEntry<unknown[]>[]>();
  private _history: EventHistoryEntry<T>[] = [];
  private _historyConfig: EventHistoryConfig;
  private _dedupeConfig: DedupeConfig;
  private _dedupeCache = new Map<string, number>();

  constructor(options?: {
    history?: EventHistoryConfig;
    dedupe?: DedupeConfig;
  }) {
    this._historyConfig = options?.history ?? { enabled: false, maxSize: 100 };
    this._dedupeConfig = options?.dedupe ?? { enabled: false, windowMs: 1000 };
  }

  // ── 注册监听器 ────────────────────────────────────────────────────────────

  /**
   * 注册事件监听器
   *
   * @example
   * bus.on("message", (msg) => console.log(msg));
   * bus.on("message:*", (msg) => console.log(msg));  // 通配符
   */
  on<K extends keyof T & string>(
    event: K,
    listener: EventListener<T[K]>,
    options?: ListenerOptions,
  ): () => void {
    return this._addListener(event, listener, options, false);
  }

  /**
   * 注册一次性事件监听器
   */
  once<K extends keyof T & string>(
    event: K,
    listener: EventListener<T[K]>,
    options?: ListenerOptions,
  ): () => void {
    return this._addListener(event, listener, options, true);
  }

  // ── 移除监听器 ────────────────────────────────────────────────────────────

  /**
   * 移除事件监听器
   */
  off<K extends keyof T & string>(event: K, listener?: EventListener<T[K]>): void {
    const key = event as string;
    const listeners = this._listeners.get(key);
    if (!listeners) return;

    if (listener) {
      const index = listeners.findIndex((e) => e.listener === listener);
      if (index !== -1) listeners.splice(index, 1);
    } else {
      this._listeners.delete(key);
    }
  }

  // ── 发射事件 ──────────────────────────────────────────────────────────────

  /**
   * 发射事件，支持通配符匹配和去重
   *
   * @example
   * bus.emit("message", "hello");
   */
  async emit<K extends keyof T & string>(event: K, ...args: T[K]): Promise<void> {
    // 去重检查
    if (this._dedupeConfig.enabled) {
      const key = this._dedupeConfig.keyExtractor
        ? this._dedupeConfig.keyExtractor(...args)
        : String(args[0]);

      const now = Date.now();
      const lastSeen = this._dedupeCache.get(key);

      if (lastSeen && now - lastSeen < (this._dedupeConfig.windowMs ?? 1000)) {
        return; // 重复事件，跳过
      }

      this._dedupeCache.set(key, now);

      // 清理过期缓存
      if (this._dedupeCache.size > 1000) {
        for (const [k, v] of this._dedupeCache) {
          if (now - v > (this._dedupeConfig.windowMs ?? 1000)) {
            this._dedupeCache.delete(k);
          }
        }
      }
    }

    // 记录历史
    if (this._historyConfig.enabled) {
      this._history.push({
        type: event,
        args,
        timestamp: Date.now(),
      });

      if (this._history.length > (this._historyConfig.maxSize ?? 100)) {
        this._history.shift();
      }
    }

    // 收集匹配的监听器（精确匹配 + 通配符匹配）
    const matched = this._collectListeners(event);

    // 按优先级排序
    matched.sort((a, b) => a.options.priority - b.options.priority);

    const toRemove: ListenerEntry<unknown[]>[] = [];

    for (const entry of matched) {
      try {
        await entry.listener(...args);
      } catch (err) {
        console.error(`[event-bus] 监听器执行出错 (${event}):`, err);
      }

      if (entry.once) {
        toRemove.push(entry);
      }

      if (entry.options.stopPropagation) {
        break;
      }
    }

    // 清理一次性监听器
    for (const entry of toRemove) {
      this._removeEntry(entry);
    }
  }

  // ── 等待事件 ──────────────────────────────────────────────────────────────

  /**
   * 等待特定事件发生
   *
   * @example
   * const reply = await bus.waitFor("reply", { timeout: 5000 });
   */
  waitFor<K extends keyof T & string>(
    event: K,
    options?: WaitForOptions,
  ): Promise<T[K]> {
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout ?? 5000;
      const filter = options?.filter;

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`等待事件 ${event} 超时 (${timeout}ms)`));
      }, timeout);

      const unsub = this.on(event, ((...args: unknown[]) => {
        if (filter && !filter(...args)) return;
        cleanup();
        resolve(args as T[K]);
      }) as EventListener<T[K]>);

      const cleanup = () => {
        clearTimeout(timer);
        unsub();
      };
    });
  }

  // ── 异步迭代 ──────────────────────────────────────────────────────────────

  /**
   * 异步迭代器，流式处理事件
   *
   * @example
   * for await (const [msg] of bus.events("message")) {
   *   console.log(msg);
   * }
   */
  async *events<K extends keyof T & string>(
    event: K,
  ): AsyncGenerator<T[K]> {
    const queue: T[K][] = [];
    let resolve: (() => void) | null = null;

    const unsub = this.on(event, ((...args: unknown[]) => {
      queue.push(args as T[K]);
      resolve?.();
    }) as EventListener<T[K]>);

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolve = r;
          });
        }

        while (queue.length > 0) {
          yield queue.shift()!;
        }
      }
    } finally {
      unsub();
    }
  }

  // ── 历史记录 ──────────────────────────────────────────────────────────────

  /**
   * 获取事件历史
   *
   * @example
   * const history = bus.getHistory("message");
   * console.log(history); // [{ type: "message", args: [...], timestamp: ... }]
   */
  getHistory<K extends keyof T & string>(event?: K): EventHistoryEntry<T>[] {
    if (event) {
      return this._history.filter((e) => e.type === event);
    }
    return [...this._history];
  }

  /**
   * 清空事件历史
   */
  clearHistory(): void {
    this._history = [];
  }

  // ── 清理 ──────────────────────────────────────────────────────────────────

  /**
   * 清理指定事件的所有监听器
   */
  clear<K extends keyof T & string>(event?: K): void {
    if (event) {
      this._listeners.delete(event as string);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<K extends keyof T & string>(event: K): number {
    const exact = this._listeners.get(event as string)?.length ?? 0;
    const wildcard = this._listeners.get(`${event}:*`)?.length ?? 0;
    return exact + wildcard;
  }

  /**
   * 获取所有已注册的事件名
   */
  eventNames(): string[] {
    return [...this._listeners.keys()];
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  /**
   * 收集匹配的监听器（精确匹配 + 通配符）
   */
  private _collectListeners(event: string): ListenerEntry<unknown[]>[] {
    const exact = this._listeners.get(event) ?? [];
    const wildcard = this._listeners.get(`${event}:*`) ?? [];
    return [...exact, ...wildcard];
  }

  /**
   * 添加监听器
   */
  private _addListener<K extends keyof T & string>(
    event: K,
    listener: EventListener<T[K]>,
    options: ListenerOptions | undefined,
    once: boolean,
  ): () => void {
    const entry: ListenerEntry<T[K]> = {
      listener,
      options: {
        priority: options?.priority ?? 100,
        stopPropagation: options?.stopPropagation ?? false,
      },
      once,
    };

    const key = event as string;
    const listeners = this._listeners.get(key) ?? [];
    listeners.push(entry as ListenerEntry<unknown[]>);
    this._listeners.set(key, listeners);

    return () => this.off(event, listener);
  }

  /**
   * 移除监听器条目
   */
  private _removeEntry(entry: ListenerEntry<unknown[]>): void {
    for (const [key, listeners] of this._listeners) {
      const index = listeners.indexOf(entry);
      if (index !== -1) {
        listeners.splice(index, 1);
        break;
      }
    }
  }
}
