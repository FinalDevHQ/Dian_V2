import { resolve } from "node:path";
import { EventEmitter } from "node:events";
import chokidar, { type FSWatcher } from "chokidar";
import { loadAllConfig, type LoaderOptions } from "./loader.js";
import { CONFIG_FILES, type AllConfig, type ConfigFileName } from "./schema.js";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface ConfigServiceEvents {
  change: [ConfigChangeEvent];
  error: [Error];
}

export interface ConfigChangeEvent {
  /** 变更的配置文件名 */
  file: ConfigFileName;
  /** 变更后的完整配置 */
  config: AllConfig;
}

export interface ConfigServiceOptions extends LoaderOptions {
  /** 配置目录路径，默认 "config" */
  configDir?: string;
}

// ---------------------------------------------------------------------------
// ConfigService
// ---------------------------------------------------------------------------

export class ConfigService extends EventEmitter<ConfigServiceEvents> {
  private _config: AllConfig | null = null;
  private _configDir: string;
  private _watcher: FSWatcher | null = null;

  constructor(options?: ConfigServiceOptions) {
    super();
    this._configDir = resolve(options?.configDir ?? "config");
  }

  // ── 初始化 ────────────────────────────────────────────────────────────────

  /**
   * 加载配置文件，失败则抛出异常（阻止启动）
   */
  init(): void {
    this._config = loadAllConfig({ configDir: this._configDir });
  }

  // ── 配置访问 ──────────────────────────────────────────────────────────────

  /** 获取完整配置 */
  get config(): AllConfig {
    this._ensureInitialized();
    return this._config!;
  }

  /** 获取 settings */
  get settings() {
    this._ensureInitialized();
    return this._config!.settings;
  }

  /** 获取所有机器人配置 */
  get bots() {
    this._ensureInitialized();
    return this._config!.bot.bots;
  }

  /** 获取模板配置 */
  get templates() {
    this._ensureInitialized();
    return this._config!.templates.templates;
  }

  /**
   * 根据 botId 获取单个机器人配置
   */
  getBot(botId: string) {
    return this.bots.find((b) => b.botId === botId);
  }

  // ── 热重载 ────────────────────────────────────────────────────────────────

  /**
   * 开启文件监听，配置变更时自动重载
   */
  watch(): void {
    if (this._watcher) return;

    const files = Object.values(CONFIG_FILES).map((f) =>
      resolve(this._configDir, f),
    );

    this._watcher = chokidar
      .watch(files, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50,
        },
      })
      .on("change", (changedPath) => {
        const filename = Object.entries(CONFIG_FILES).find(([, f]) =>
          changedPath.endsWith(f),
        )?.[0] as ConfigFileName | undefined;

        if (!filename) return;

        try {
          const newConfig = loadAllConfig({ configDir: this._configDir });
          this._config = newConfig;
          this.emit("change", { file: filename, config: newConfig });
        } catch (err) {
          this.emit("error", err as Error);
        }
      });
  }

  /**
   * 关闭文件监听
   */
  async unwatch(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
  }

  // ── 工具方法 ──────────────────────────────────────────────────────────────

  /**
   * 返回脱敏后的配置（用于管理面板展示）
   */
  redact(): AllConfig {
    const config = JSON.parse(JSON.stringify(this.config)) as AllConfig;

    // 脱敏 auth 字段
    if (config.settings.auth?.passwordHash) {
      config.settings.auth.passwordHash = "***";
    }
    if (config.settings.auth?.jwtSecret) {
      config.settings.auth.jwtSecret = "***";
    }

    // 脱敏机器人 options 中的敏感字段
    for (const bot of config.bot.bots) {
      if (bot.options && typeof bot.options === "object") {
        const opts = bot.options as Record<string, unknown>;
        if (opts.accessToken) opts.accessToken = "***";
        if (opts.token) opts.token = "***";
      }
    }

    return config;
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _ensureInitialized(): void {
    if (!this._config) {
      throw new Error("[config] ConfigService 尚未初始化，请先调用 init()");
    }
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建 ConfigService 实例
 *
 * @example
 * const config = createConfigService({ configDir: "./config" });
 * config.init();
 * console.log(config.settings);
 */
export function createConfigService(options?: ConfigServiceOptions): ConfigService {
  return new ConfigService(options);
}
