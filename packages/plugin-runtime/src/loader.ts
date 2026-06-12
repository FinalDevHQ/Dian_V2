import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ChildLogger } from "@myfinal/dian-logger";
import type {
  PluginMeta,
  PluginInstance,
  HandlerMeta,
  InterceptorMeta,
} from "./types.js";
import { PLUGIN_META_KEY, HANDLER_META_KEY, INTERCEPTOR_META_KEY } from "./types.js";

// ---------------------------------------------------------------------------
// 类型守卫
// ---------------------------------------------------------------------------

function isPluginClass(val: unknown): val is new () => unknown {
  return typeof val === "function";
}

// ---------------------------------------------------------------------------
// PluginLoader
// ---------------------------------------------------------------------------

export class PluginLoader {
  private _logger: ChildLogger;

  constructor(logger: ChildLogger) {
    this._logger = logger;
  }

  /**
   * 从目录扫描插件文件
   */
  async scanDir(pluginsDir: string): Promise<string[]> {
    const dir = resolve(pluginsDir);
    const paths: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.name.endsWith(".js")) continue;

        const entryPath = join(dir, entry.name);
        const importPath = entry.isDirectory()
          ? join(entryPath, "index.js")
          : entryPath;

        paths.push(importPath);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this._logger.warn(`插件目录不存在: ${dir}`);
      } else {
        throw err;
      }
    }

    return paths;
  }

  /**
   * 加载单个插件文件
   */
  async loadFile(filePath: string): Promise<PluginInstance | null> {
    try {
      // ESM cache busting
      const timestamp = Date.now();
      const importPath = `${filePath}?t=${timestamp}`;
      const mod = await import(importPath);

      const PluginClass = mod.default ?? mod;

      if (!isPluginClass(PluginClass)) {
        this._logger.warn(`无效的插件类: ${filePath}`);
        return null;
      }

      // 读取元数据
      const meta: PluginMeta | undefined = Reflect.getMetadata(
        PLUGIN_META_KEY,
        PluginClass,
      );

      if (!meta) {
        this._logger.warn(`缺少 @Plugin 装饰器: ${filePath}`);
        return null;
      }

      // 创建实例
      const instance = new PluginClass();

      // 读取处理器
      const handlers: HandlerMeta[] =
        Reflect.getMetadata(HANDLER_META_KEY, PluginClass) ?? [];

      // 读取拦截器（按优先级排序）
      const interceptors: InterceptorMeta[] = (
        Reflect.getMetadata(INTERCEPTOR_META_KEY, PluginClass) ?? []
      ).sort((a: InterceptorMeta, b: InterceptorMeta) => a.priority - b.priority);

      this._logger.debug(`加载插件: ${meta.name}`);

      return {
        meta,
        instance,
        handlers,
        interceptors,
        filePath,
        enabled: true,
      };
    } catch (err) {
      this._logger.error(`加载插件失败: ${filePath}`, {
        error: (err as Error).message,
      });
      return null;
    }
  }
}
