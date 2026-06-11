import { resolve } from "node:path";
import { Logger } from "@myfinal/dian-logger";
import { createEventBus } from "@myfinal/dian-event-bus";
import type { MiddlewareEventBus } from "@myfinal/dian-event-bus";
import type { BotEvent } from "@myfinal/dian-shared";
import type {
  PluginMeta,
  PluginInstance,
  PluginDefinition,
  PluginPermission,
  DependencyCheckResult,
} from "./types.js";
import { PluginLoader } from "./loader.js";
import { HotReloadWatcher } from "./watcher.js";
import { dispatchEvent } from "./dispatcher.js";
import { PluginSandboxManager, createEventContext } from "./sandbox.js";
import { checkDependencies, checkAllDependencies, getStartupOrder } from "./dependencies.js";

// ---------------------------------------------------------------------------
// PluginManager - Pro 版插件管理器
// ---------------------------------------------------------------------------

export class PluginManager {
  private _plugins = new Map<string, PluginInstance>();
  private _definitions = new Map<string, PluginDefinition>();
  private _blacklist = new Set<string>();
  private _loader: PluginLoader;
  private _watcher: HotReloadWatcher | null = null;
  private _logger: Logger;
  private _events: MiddlewareEventBus<Record<string, unknown[]>>;
  private _maintenanceMode = false;
  private _sandboxManager: PluginSandboxManager;

  constructor() {
    this._logger = new Logger("plugin-runtime", { level: "info" });
    this._events = createEventBus();
    this._loader = new PluginLoader(this._logger.child({ module: "loader" }));
    this._sandboxManager = new PluginSandboxManager();
  }

  // ── 属性 ──────────────────────────────────────────────────────────────────

  /** 获取所有已加载的插件 */
  get plugins(): readonly PluginInstance[] {
    return [...this._plugins.values()];
  }

  /** 获取插件数量 */
  get count(): number {
    return this._plugins.size;
  }

  /** 获取事件总线 */
  get events(): MiddlewareEventBus<Record<string, unknown[]>> {
    return this._events;
  }

  /** 获取沙箱管理器 */
  get sandbox(): PluginSandboxManager {
    return this._sandboxManager;
  }

  // ── 注册 ──────────────────────────────────────────────────────────────────

  /**
   * 注册插件（装饰器模式）
   */
  register(instance: PluginInstance): void {
    const { name } = instance.meta;

    if (this._plugins.has(name)) {
      throw new Error(`插件 "${name}" 已存在`);
    }

    // 检查依赖
    const depResult = checkDependencies(instance, this._plugins);
    if (!depResult.ok) {
      this._logger.warn(`插件 "${name}" 依赖检查失败`, {
        missing: depResult.missing,
        versionMismatch: depResult.versionMismatch,
      });
    }

    this._plugins.set(name, instance);
    this._logger.info(`注册插件: ${name} (v${instance.meta.version ?? "0.0.0"})`);
  }

  /**
   * 注册插件定义（函数式模式）
   */
  registerDefinition(definition: PluginDefinition): void {
    const { name } = definition.meta;

    this._definitions.set(name, definition);

    // 转换为 PluginInstance
    const instance: PluginInstance = {
      meta: definition.meta,
      instance: definition,
      handlers: definition.handlers?.map((h) => ({
        method: "handler",
        pattern: h.pattern,
      })) ?? [],
      interceptors: definition.interceptors?.map((i) => ({
        method: "interceptor",
        priority: i.priority,
      })) ?? [],
      filePath: "",
      enabled: true,
      loadedAt: Date.now(),
    };

    this._plugins.set(name, instance);
    this._logger.info(`注册插件定义: ${name}`);
  }

  // ── 加载 ──────────────────────────────────────────────────────────────────

  /**
   * 从目录加载所有插件
   */
  async loadAll(pluginsDir: string): Promise<void> {
    const dir = resolve(pluginsDir);
    this._logger.info(`扫描插件目录: ${dir}`);

    const filePaths = await this._loader.scanDir(dir);

    for (const filePath of filePaths) {
      await this.loadFromPath(filePath);
    }

    // 检查所有依赖
    const depErrors = checkAllDependencies(this._plugins);
    if (depErrors.length > 0) {
      for (const { plugin, result } of depErrors) {
        this._logger.error(`插件 "${plugin}" 依赖问题`, {
          missing: result.missing,
          versionMismatch: result.versionMismatch,
        });
      }
    }

    this._logger.info(`加载完成，共 ${this._plugins.size} 个插件`);
  }

  /**
   * 从路径加载单个插件
   */
  async loadFromPath(filePath: string): Promise<PluginInstance | null> {
    const instance = await this._loader.loadFile(filePath);
    if (instance) {
      this.register(instance);

      // 创建沙箱
      const sandboxLogger = this._logger.child({ plugin: instance.meta.name });
      const sandbox = this._sandboxManager.createSandbox(
        instance,
        sandboxLogger,
        this._events,
        {},
      );
      instance.sandbox = sandbox;
      instance.loadedAt = Date.now();

      // 触发 onSetup
      const def = this._definitions.get(instance.meta.name);
      if (def?.onSetup) {
        try {
          await def.onSetup({
            config: {},
            logger: sandboxLogger,
            events: this._events,
          });
        } catch (err) {
          this._logger.error(`插件 "${instance.meta.name}" onSetup 失败`, {
            error: (err as Error).message,
          });
        }
      }

      // 发射事件
      await this._events.emit("plugin:loaded" as never, instance.meta);
    }
    return instance;
  }

  // ── 卸载 ──────────────────────────────────────────────────────────────────

  /**
   * 卸载插件
   */
  async unload(name: string): Promise<void> {
    const instance = this._plugins.get(name);
    if (!instance) return;

    this._logger.info(`卸载插件: ${name}`);

    // 触发 onStop
    const def = this._definitions.get(name);
    if (def?.onStop) {
      try {
        await def.onStop();
      } catch (err) {
        this._logger.error(`插件 "${name}" onStop 失败`, {
          error: (err as Error).message,
        });
      }
    }

    // 移除沙箱
    this._sandboxManager.removeSandbox(name);

    this._plugins.delete(name);
    this._definitions.delete(name);

    // 发射事件
    await this._events.emit("plugin:unloaded" as never, name);
  }

  // ── 热重载 ────────────────────────────────────────────────────────────────

  /**
   * 开启热重载
   */
  watch(pluginsDir: string): void {
    if (this._watcher) return;

    this._watcher = new HotReloadWatcher({
      onAdd: async (filePath) => {
        this._logger.info(`发现新插件: ${filePath}`);
        await this.loadFromPath(filePath);
      },
      onChange: async (filePath) => {
        this._logger.info(`插件变更: ${filePath}`);
        for (const [name, instance] of this._plugins) {
          if (instance.filePath === filePath) {
            await this.unload(name);
            await this.loadFromPath(filePath);
            break;
          }
        }
      },
      onUnlink: async (filePath) => {
        this._logger.info(`插件删除: ${filePath}`);
        for (const [name, instance] of this._plugins) {
          if (instance.filePath === filePath) {
            await this.unload(name);
            break;
          }
        }
      },
    });

    this._watcher.watch(pluginsDir);
    this._logger.info(`开启热重载: ${pluginsDir}`);
  }

  /**
   * 关闭热重载
   */
  async unwatch(): Promise<void> {
    if (this._watcher) {
      await this._watcher.unwatch();
      this._watcher = null;
    }
  }

  // ── 事件分发 ──────────────────────────────────────────────────────────────

  /**
   * 分发事件到所有插件
   */
  async dispatch(
    event: BotEvent,
    options: {
      reply: (text: string) => Promise<void>;
      sendAction: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
    },
  ): Promise<void> {
    if (this._maintenanceMode) {
      this._logger.debug("维护模式，跳过事件分发");
      return;
    }

    // 过滤黑名单和禁用的插件
    const activePlugins = this.plugins.filter(
      (p) => p.enabled && !this._blacklist.has(p.meta.name),
    );

    const result = await dispatchEvent(event, activePlugins, options);

    if (result.stopped) {
      this._logger.debug("事件被拦截器停止");
    }
  }

  // ── 权限管理 ──────────────────────────────────────────────────────────────

  /**
   * 设置插件权限
   */
  setPermissions(pluginName: string, permissions: PluginPermission[]): void {
    this._sandboxManager.setPermissions(pluginName, {
      allowed: permissions,
    });
  }

  /**
   * 检查插件权限
   */
  hasPermission(pluginName: string, permission: PluginPermission): boolean {
    return this._sandboxManager.hasPermission(pluginName, permission);
  }

  // ── 依赖管理 ──────────────────────────────────────────────────────────────

  /**
   * 检查插件依赖
   */
  checkDependencies(pluginName: string): DependencyCheckResult | undefined {
    const plugin = this._plugins.get(pluginName);
    if (!plugin) return undefined;
    return checkDependencies(plugin, this._plugins);
  }

  /**
   * 检查所有插件依赖
   */
  checkAllDependencies(): { plugin: string; result: DependencyCheckResult }[] {
    return checkAllDependencies(this._plugins);
  }

  /**
   * 获取启动顺序
   */
  getStartupOrder(): string[] {
    return getStartupOrder(this._plugins);
  }

  // ── 黑名单 ────────────────────────────────────────────────────────────────

  /**
   * 加入黑名单（禁用插件）
   */
  addToBlacklist(name: string): void {
    this._blacklist.add(name);
    this._logger.info(`插件 "${name}" 已加入黑名单`);
  }

  /**
   * 从黑名单移除
   */
  removeFromBlacklist(name: string): void {
    this._blacklist.delete(name);
    this._logger.info(`插件 "${name}" 已从黑名单移除`);
  }

  // ── 维护模式 ──────────────────────────────────────────────────────────────

  /**
   * 设置维护模式
   */
  setMaintenanceMode(enabled: boolean): void {
    this._maintenanceMode = enabled;
    this._logger.info(`维护模式: ${enabled ? "开启" : "关闭"}`);
  }

  // ── 查询 ──────────────────────────────────────────────────────────────────

  /**
   * 获取插件元数据列表
   */
  listMeta(): PluginMeta[] {
    return this.plugins.map((p) => p.meta);
  }

  /**
   * 获取单个插件
   */
  getPlugin(name: string): PluginInstance | undefined {
    return this._plugins.get(name);
  }

  /**
   * 获取按启动顺序排列的插件
   */
  getPluginsByStartupOrder(): PluginInstance[] {
    const order = this.getStartupOrder();
    return order
      .map((name) => this._plugins.get(name))
      .filter((p): p is PluginInstance => p !== undefined);
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建插件管理器
 *
 * @example
 * const manager = createPluginManager();
 * await manager.loadAll("./plugins");
 * await manager.dispatch(event, { reply, sendAction });
 */
export function createPluginManager(): PluginManager {
  return new PluginManager();
}
