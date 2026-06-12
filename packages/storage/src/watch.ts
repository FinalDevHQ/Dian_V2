// ---------------------------------------------------------------------------
// 事件类型
// ---------------------------------------------------------------------------

export type WatchEventType = "insert" | "update" | "delete";

export interface WatchEvent<T = unknown> {
  type: WatchEventType;
  table: string;
  data: T;
  timestamp: number;
}

export type WatchCallback<T = unknown> = (event: WatchEvent<T>) => void;

// ---------------------------------------------------------------------------
// WatchManager
// ---------------------------------------------------------------------------

export class WatchManager {
  private _listeners = new Map<string, Set<WatchCallback>>();

  /**
   * 监听表变更
   */
  on<T = unknown>(table: string, callback: WatchCallback<T>): () => void {
    const key = table;
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key)!.add(callback as WatchCallback);

    // 返回取消函数
    return () => {
      this._listeners.get(key)?.delete(callback as WatchCallback);
    };
  }

  /**
   * 移除监听
   */
  off(table: string, callback?: WatchCallback): void {
    if (callback) {
      this._listeners.get(table)?.delete(callback);
    } else {
      this._listeners.delete(table);
    }
  }

  /**
   * 发射事件（内部调用）
   */
  emit<T>(table: string, event: WatchEvent<T>): void {
    const listeners = this._listeners.get(table);
    if (!listeners) return;

    for (const callback of listeners) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[storage] watch 回调出错 (${table}):`, err);
      }
    }
  }

  /**
   * 清理所有监听
   */
  clear(): void {
    this._listeners.clear();
  }
}

// ---------------------------------------------------------------------------
// 全局实例
// ---------------------------------------------------------------------------

export const watchManager = new WatchManager();
