import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Logger } from "@myfinal/dian-logger";
import { createEventBus } from "@myfinal/dian-event-bus";
import type { MiddlewareEventBus } from "@myfinal/dian-event-bus";
import type {
  Module,
  ModuleInstance,
  ModuleContext,
  ModuleStatus,
  ModuleManagerConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// 类型守卫
// ---------------------------------------------------------------------------

function isModule(val: unknown): val is Module {
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
// ModuleManager - Pro 版模块管理器
// ---------------------------------------------------------------------------

export class ModuleManager {
  private _modules = new Map<string, ModuleInstance>();
  private _order: string[] = [];
  private _config: ModuleManagerConfig;
  private _logger: Logger;
  private _events: MiddlewareEventBus<Record<string, unknown[]>>;
  private _healthCheckTimer?: ReturnType<typeof setInterval>;

  constructor(config?: ModuleManagerConfig) {
    this._config = {
      modulesDir: "modules",
      startupTimeout: 30000,
      healthCheck: false,
      healthCheckInterval: 60000,
      ...config,
    };

    this._logger = new Logger("module-runtime", { level: "info" });
    this._events = createEventBus();
  }

  // ── 属性 ──────────────────────────────────────────────────────────────────

  /** 获取所有已注册的模块 */
  get modules(): readonly ModuleInstance[] {
    return this._order.map((name) => this._modules.get(name)!);
  }

  /** 获取模块数量 */
  get count(): number {
    return this._modules.size;
  }

  /** 获取事件总线 */
  get events(): MiddlewareEventBus<Record<string, unknown[]>> {
    return this._events;
  }

  // ── 注册 ──────────────────────────────────────────────────────────────────

  /**
   * 手动注册模块
   */
  register(module: Module, config?: unknown): void {
    const name = module.name;

    if (this._modules.has(name)) {
      throw new Error(`模块 "${name}" 已存在`);
    }

    // 检查依赖
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        if (!this._modules.has(dep)) {
          this._logger.warn(`模块 "${name}" 依赖 "${dep}"，但该模块尚未注册`);
        }
      }
    }

    const instance: ModuleInstance = {
      module,
      status: "pending",
    };

    this._modules.set(name, instance);
    this._order.push(name);

    this._logger.debug(`注册模块: ${name}`);
  }

  // ── 启动 ──────────────────────────────────────────────────────────────────

  /**
   * 启动所有模块（按依赖顺序）
   */
  async startAll(): Promise<void> {
    const startTime = Date.now();
    this._logger.info(`开始启动 ${this._order.length} 个模块...`);

    // 拓扑排序
    const sorted = this._topologicalSort();

    for (const name of sorted) {
      const instance = this._modules.get(name)!;

      if (instance.status === "running") {
        this._logger.debug(`模块 "${name}" 已在运行，跳过`);
        continue;
      }

      try {
        await this._startModule(instance);
      } catch (err) {
        this._logger.error(`模块 "${name}" 启动失败`, {
          error: (err as Error).message,
        });
        instance.status = "error";
        instance.error = err as Error;

        // 如果模块没有声明为可选，抛出错误
        throw err;
      }

      // 检查启动超时
      if (Date.now() - startTime > (this._config.startupTimeout ?? 30000)) {
        throw new Error("模块启动超时");
      }
    }

    // 触发 onReady
    for (const name of sorted) {
      const instance = this._modules.get(name)!;
      if (instance.status === "running" && instance.module.onReady) {
        try {
          const ctx = this._createContext(name);
          await instance.module.onReady(ctx);
        } catch (err) {
          this._logger.error(`模块 "${name}" onReady 执行出错`, {
            error: (err as Error).message,
          });
        }
      }
    }

    // 启动健康检查
    if (this._config.healthCheck) {
      this._startHealthCheck();
    }

    this._logger.info(`所有模块启动完成，耗时 ${Date.now() - startTime}ms`);

    // 发射启动完成事件
    await this._events.emit("modules:started" as never);
  }

  /**
   * 启动单个模块
   */
  private async _startModule(instance: ModuleInstance): Promise<void> {
    const { module } = instance;
    const name = module.name;

    instance.status = "starting";
    this._logger.info(`启动模块: ${name}`);

    const ctx = this._createContext(name);

    try {
      await Promise.race([
        module.setup(ctx),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`模块 "${name}" 启动超时`)),
            this._config.startupTimeout ?? 30000,
          ),
        ),
      ]);

      instance.status = "running";
      instance.startedAt = Date.now();
      this._logger.info(`模块 "${name}" 启动成功`);

      // 发射模块启动事件
      await this._events.emit("module:started" as never, name);
    } catch (err) {
      instance.status = "error";
      instance.error = err as Error;
      throw err;
    }
  }

  // ── 停止 ──────────────────────────────────────────────────────────────────

  /**
   * 停止所有模块（反向顺序）
   */
  async stopAll(): Promise<void> {
    this._logger.info("开始停止所有模块...");

    // 停止健康检查
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
      this._healthCheckTimer = undefined;
    }

    // 反向停止
    const reversed = [...this._order].reverse();

    for (const name of reversed) {
      const instance = this._modules.get(name)!;

      if (instance.status !== "running") continue;

      try {
        await this._stopModule(instance);
      } catch (err) {
        this._logger.error(`模块 "${name}" 停止失败`, {
          error: (err as Error).message,
        });
      }
    }

    this._logger.info("所有模块已停止");

    // 发射停止完成事件
    await this._events.emit("modules:stopped" as never);
  }

  /**
   * 停止单个模块
   */
  private async _stopModule(instance: ModuleInstance): Promise<void> {
    const { module } = instance;
    const name = module.name;

    instance.status = "stopping";
    this._logger.info(`停止模块: ${name}`);

    const ctx = this._createContext(name);

    try {
      await module.teardown(ctx);
      instance.status = "stopped";
      this._logger.info(`模块 "${name}" 已停止`);

      // 发射模块停止事件
      await this._events.emit("module:stopped" as never, name);
    } catch (err) {
      instance.status = "error";
      instance.error = err as Error;
      throw err;
    }
  }

  // ── 模块发现 ──────────────────────────────────────────────────────────────

  /**
   * 从目录发现并注册模块
   */
  async discover(modulesDir?: string): Promise<void> {
    const dir = resolve(modulesDir ?? this._config.modulesDir ?? "modules");

    this._logger.info(`扫描模块目录: ${dir}`);

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.name.endsWith(".js")) continue;

        const entryPath = join(dir, entry.name);
        const importPath = entry.isDirectory()
          ? join(entryPath, "index.js")
          : entryPath;

        try {
          const mod = await import(importPath);
          const defaultExport = mod.default ?? mod;

          if (isModule(defaultExport)) {
            this.register(defaultExport);
            this._logger.debug(`发现模块: ${defaultExport.name}`);
          } else {
            this._logger.warn(`跳过无效模块: ${importPath}`);
          }
        } catch (err) {
          this._logger.error(`导入模块失败: ${importPath}`, {
            error: (err as Error).message,
          });
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this._logger.warn(`模块目录不存在: ${dir}`);
      } else {
        throw err;
      }
    }
  }

  // ── 健康检查 ──────────────────────────────────────────────────────────────

  private _startHealthCheck(): void {
    this._healthCheckTimer = setInterval(async () => {
      for (const [name, instance] of this._modules) {
        if (instance.status !== "running") continue;

        if (instance.module.healthCheck) {
          try {
            const ctx = this._createContext(name);
            const healthy = await instance.module.healthCheck(ctx);

            if (!healthy) {
              this._logger.warn(`模块 "${name}" 健康检查失败`);
              await this._events.emit("module:unhealthy" as never, name);
            }
          } catch (err) {
            this._logger.error(`模块 "${name}" 健康检查出错`, {
              error: (err as Error).message,
            });
          }
        }
      }
    }, this._config.healthCheckInterval ?? 60000);
  }

  // ── 工具方法 ──────────────────────────────────────────────────────────────

  /**
   * 创建模块上下文
   */
  private _createContext(name: string): ModuleContext {
    const instance = this._modules.get(name)!;
    const config = (instance.module as any).config ?? {};

    return {
      name,
      config,
      logger: this._logger.child({ module: name }),
      events: this._events,
      dependencies: this._getDependencies(name),
      getModule: <T extends ModuleInstance = ModuleInstance>(depName: string) => {
        return this._modules.get(depName) as T | undefined;
      },
    };
  }

  /**
   * 获取模块的依赖
   */
  private _getDependencies(name: string): Map<string, ModuleInstance> {
    const instance = this._modules.get(name)!;
    const deps = new Map<string, ModuleInstance>();

    if (instance.module.dependencies) {
      for (const dep of instance.module.dependencies) {
        const depInstance = this._modules.get(dep);
        if (depInstance) {
          deps.set(dep, depInstance);
        }
      }
    }

    return deps;
  }

  /**
   * 拓扑排序（确保依赖先启动）
   */
  private _topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const instance = this._modules.get(name);
      if (instance?.module.dependencies) {
        for (const dep of instance.module.dependencies) {
          visit(dep);
        }
      }

      result.push(name);
    };

    for (const name of this._order) {
      visit(name);
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建模块管理器
 *
 * @example
 * const manager = createModuleManager({ modulesDir: "./modules" });
 * await manager.discover();
 * await manager.startAll();
 */
export function createModuleManager(config?: ModuleManagerConfig): ModuleManager {
  return new ModuleManager(config);
}
