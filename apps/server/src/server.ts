import { Logger } from "@myfinal/dian-logger";
import { createConfigService } from "@myfinal/dian-config";
import { createEventBus } from "@myfinal/dian-event-bus";
import { createModuleManager } from "@myfinal/dian-module-runtime";
import { createPluginManager } from "@myfinal/dian-plugin-runtime";
import { createStorageService } from "@myfinal/dian-storage";
import type { BotEvent } from "@myfinal/dian-shared";

// ---------------------------------------------------------------------------
// DianServer - 应用入口
// ---------------------------------------------------------------------------

export class DianServer {
  private _logger: Logger;
  private _config: ReturnType<typeof createConfigService>;
  private _events: ReturnType<typeof createEventBus>;
  private _modules: ReturnType<typeof createModuleManager>;
  private _plugins: ReturnType<typeof createPluginManager>;
  private _storage: ReturnType<typeof createStorageService>;
  private _running = false;

  constructor() {
    this._logger = new Logger("server", { level: "info", pretty: true });
    this._config = createConfigService();
    this._events = createEventBus();
    this._modules = createModuleManager();
    this._plugins = createPluginManager();
    this._storage = createStorageService();
  }

  // ── 属性 ──────────────────────────────────────────────────────────────────

  /** 是否运行中 */
  get running(): boolean {
    return this._running;
  }

  /** 日志器 */
  get logger(): Logger {
    return this._logger;
  }

  /** 配置服务 */
  get config() {
    return this._config;
  }

  /** 事件总线 */
  get events() {
    return this._events;
  }

  /** 模块管理器 */
  get modules() {
    return this._modules;
  }

  /** 插件管理器 */
  get plugins() {
    return this._plugins;
  }

  /** 存储服务 */
  get storage() {
    return this._storage;
  }

  // ── 启动 ──────────────────────────────────────────────────────────────────

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this._running) {
      this._logger.warn("服务器已在运行");
      return;
    }

    const startTime = Date.now();
    this._logger.info("启动 Dian V2 服务器...");

    try {
      // 1. 加载配置
      this._logger.info("加载配置...");
      this._config.init();

      // 2. 初始化存储
      this._logger.info("初始化存储...");
      await this._storage.init({
        sqlite: this._config.settings.storage?.sqlite ?? "data/dian.db",
      });

      // 3. 发现并启动模块
      this._logger.info("加载模块...");
      await this._modules.discover("./modules");
      await this._modules.startAll();

      // 4. 加载插件
      this._logger.info("加载插件...");
      await this._plugins.loadAll("./plugins");
      this._plugins.watch("./plugins");

      // 5. 开启配置热重载
      this._config.watch();
      this._config.on("change", (event) => {
        this._logger.info(`配置变更: ${event.file}`);
        this._events.emit("config:change" as never, event);
      });

      this._running = true;
      this._logger.info(`服务器启动完成，耗时 ${Date.now() - startTime}ms`);

      // 发射启动完成事件
      await this._events.emit("server:started" as never);

    } catch (err) {
      this._logger.error("服务器启动失败", {
        error: (err as Error).message,
      });
      throw err;
    }
  }

  // ── 停止 ──────────────────────────────────────────────────────────────────

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this._running) {
      this._logger.warn("服务器未在运行");
      return;
    }

    this._logger.info("停止服务器...");

    try {
      // 1. 停止插件
      this._logger.info("停止插件...");
      await this._plugins.unwatch();
      for (const plugin of this._plugins.plugins) {
        await this._plugins.unload(plugin.meta.name);
      }

      // 2. 停止模块
      this._logger.info("停止模块...");
      await this._modules.stopAll();

      // 3. 关闭配置监听
      await this._config.unwatch();

      // 4. 关闭存储
      this._logger.info("关闭存储...");
      this._storage.close();

      this._running = false;
      this._logger.info("服务器已停止");

      // 发射停止事件
      await this._events.emit("server:stopped" as never);

    } catch (err) {
      this._logger.error("服务器停止失败", {
        error: (err as Error).message,
      });
      throw err;
    }
  }

  // ── 事件分发 ──────────────────────────────────────────────────────────────

  /**
   * 分发事件到插件
   */
  async dispatch(event: BotEvent): Promise<void> {
    if (!this._running) {
      this._logger.warn("服务器未运行，跳过事件分发");
      return;
    }

    await this._plugins.dispatch(event, {
      reply: async (text) => {
        // TODO: 通过适配器发送回复
        this._logger.debug(`回复: ${text}`);
      },
      sendAction: async (action, params) => {
        // TODO: 通过适配器发送动作
        this._logger.debug(`发送动作: ${action}`, params);
        return { ok: true, status: "ok" };
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建并启动服务器
 *
 * @example
 * import { createServer } from "@dian/server";
 *
 * const server = createServer();
 * await server.start();
 */
export function createServer(): DianServer {
  return new DianServer();
}
