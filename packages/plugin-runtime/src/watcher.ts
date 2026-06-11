import { resolve } from "node:path";
import chokidar, { type FSWatcher } from "chokidar";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface WatcherCallbacks {
  onAdd?: (filePath: string) => void;
  onChange?: (filePath: string) => void;
  onUnlink?: (filePath: string) => void;
}

// ---------------------------------------------------------------------------
// HotReloadWatcher
// ---------------------------------------------------------------------------

export class HotReloadWatcher {
  private _watcher: FSWatcher | null = null;
  private _callbacks: WatcherCallbacks;

  constructor(callbacks: WatcherCallbacks) {
    this._callbacks = callbacks;
  }

  /**
   * 开始监听
   */
  watch(dir: string): void {
    if (this._watcher) return;

    const resolvedDir = resolve(dir);

    this._watcher = chokidar
      .watch(resolvedDir, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 50,
        },
        ignored: /(^|[\/\\])\../, // 忽略 . 文件
      })
      .on("change", (path) => {
        if (this._isPluginEntry(path)) {
          this._callbacks.onChange?.(path);
        }
      })
      .on("add", (path) => {
        if (this._isPluginEntry(path)) {
          this._callbacks.onAdd?.(path);
        }
      })
      .on("unlink", (path) => {
        if (this._isPluginEntry(path)) {
          this._callbacks.onUnlink?.(path);
        }
      });
  }

  /**
   * 停止监听
   */
  async unwatch(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * 检查文件是否是插件入口
   */
  private _isPluginEntry(filePath: string): boolean {
    // 直接 .js 文件
    if (filePath.endsWith(".js")) {
      return true;
    }

    // 目录下的 index.js
    if (filePath.endsWith("/index.js") || filePath.endsWith("\\index.js")) {
      return true;
    }

    return false;
  }
}
