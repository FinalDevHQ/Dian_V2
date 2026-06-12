import pino, { type Logger as PinoLogger, type LoggerOptions } from "pino";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 日志级别 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/** Logger 配置选项 */
export interface LoggerOptions_Config {
  /** 日志级别，默认 info */
  level?: LogLevel;
  /** 是否启用日志，默认 true */
  enabled?: boolean;
  /** 是否启用 pino-pretty 格式化（开发模式用），默认 false */
  pretty?: boolean;
  /** 日志文件输出路径，不填则只输出到 stdout */
  logFile?: string;
}

// ---------------------------------------------------------------------------
// Logger 核心类
// ---------------------------------------------------------------------------

export class Logger {
  private _logger: PinoLogger;
  private _enabled: boolean;

  constructor(
    private readonly _name: string,
    private readonly _options: LoggerOptions_Config = {},
    parent?: PinoLogger,
  ) {
    this._enabled = _options.enabled !== false;

    if (parent) {
      this._logger = parent.child({ module: _name });
    } else {
      this._logger = this._createLogger(_options);
    }
  }

  // ── 工厂方法 ──────────────────────────────────────────────────────────────

  private _createLogger(options: LoggerOptions_Config): PinoLogger {
    const { level = "info", pretty = false, logFile } = options;

    const pinoOptions: LoggerOptions = { level };

    if (pretty) {
      return pino(
        pinoOptions,
        pino.transport({ target: "pino-pretty", options: { colorize: true } }),
      );
    }

    if (logFile) {
      return pino(
        pinoOptions,
        pino.multistream([
          { stream: process.stdout },
          { stream: pino.destination(logFile) },
        ]),
      );
    }

    return pino(pinoOptions);
  }

  // ── 开关控制 ──────────────────────────────────────────────────────────────

  /** 启用日志 */
  enable(): void {
    this._enabled = true;
  }

  /** 禁用日志 */
  disable(): void {
    this._enabled = false;
  }

  /** 是否启用 */
  get enabled(): boolean {
    return this._enabled;
  }

  // ── 动态修改级别 ─────────────────────────────────────────────────────────

  /** 动态设置日志级别 */
  setLevel(level: LogLevel): void {
    this._logger.level = level;
  }

  /** 获取当前日志级别 */
  get level(): LogLevel {
    return this._logger.level as LogLevel;
  }

  // ── 日志方法 ──────────────────────────────────────────────────────────────

  trace(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    meta ? this._logger.trace(meta, msg) : this._logger.trace(msg);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    meta ? this._logger.debug(meta, msg) : this._logger.debug(msg);
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    meta ? this._logger.info(meta, msg) : this._logger.info(msg);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    meta ? this._logger.warn(meta, msg) : this._logger.warn(msg);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    meta ? this._logger.error(meta, msg) : this._logger.error(msg);
  }

  fatal(msg: string, meta?: Record<string, unknown>): void {
    meta ? this._logger.fatal(meta, msg) : this._logger.fatal(msg);
  }

  // ── 子 Logger ─────────────────────────────────────────────────────────────

  /**
   * 创建子 logger，自动附加 bindings 到每条日志
   *
   * @example
   * const botLogger = logger.child({ botId: "bot-001" });
   * botLogger.info("connected");
   */
  child(bindings: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this._name, this._logger.child(bindings));
  }

  /**
   * 创建带前缀的子 logger
   *
   * @example
   * const pluginLogger = logger.withPrefix("plugin:onebot");
   * pluginLogger.info("loaded");
   */
  withPrefix(prefix: string): ChildLogger {
    return new ChildLogger(this._name, this._logger, prefix);
  }

  // ── 属性 ──────────────────────────────────────────────────────────────────

  /** 获取内部 pino logger（高级用途） */
  get pino(): PinoLogger {
    return this._logger;
  }
}

// ---------------------------------------------------------------------------
// ChildLogger - 子 logger，支持独立开关 + prefix
// ---------------------------------------------------------------------------

export class ChildLogger {
  private readonly _prefix?: string;
  private _enabled: boolean = true;

  constructor(
    private readonly _parentName: string,
    private readonly _logger: PinoLogger,
    prefix?: string,
  ) {
    this._prefix = prefix;
  }

  // ── 开关控制（独立于父 logger）────────────────────────────────────────────

  /** 启用此子 logger */
  enable(): void {
    this._enabled = true;
  }

  /** 禁用此子 logger（不影响父 logger） */
  disable(): void {
    this._enabled = false;
  }

  /** 是否启用 */
  get enabled(): boolean {
    return this._enabled;
  }

  // ── 日志方法 ──────────────────────────────────────────────────────────────

  trace(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this._log("trace", msg, meta);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this._log("debug", msg, meta);
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this._log("info", msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this._log("warn", msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this._log("error", msg, meta);
  }

  fatal(msg: string, meta?: Record<string, unknown>): void {
    this._log("fatal", msg, meta);
  }

  // ── 子 Logger ─────────────────────────────────────────────────────────────

  child(bindings: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this._parentName, this._logger.child(bindings), this._prefix);
  }

  withPrefix(prefix: string): ChildLogger {
    const fullPrefix = this._prefix ? `${this._prefix}:${prefix}` : prefix;
    return new ChildLogger(this._parentName, this._logger, fullPrefix);
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    const entry = this._prefix ? { prefix: this._prefix, ...meta } : meta;
    entry ? this._logger[level](entry, msg) : this._logger[level](msg);
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建 logger 实例
 *
 * @example
 * const logger = createLogger("app", { level: "debug", pretty: true });
 * logger.info("started");
 */
export function createLogger(name: string, options?: LoggerOptions_Config): Logger {
  return new Logger(name, options);
}
