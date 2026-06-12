import { Logger } from "@myfinal/dian-logger";
import { parseCron, getNextRunTime } from "./cron.js";
import type { TaskOptions, TaskInstance, TaskStatus, CronFields } from "./types.js";

export type SchedulerEventType = "task:start" | "task:complete" | "task:fail" | "task:pause" | "task:resume";

export interface SchedulerEvent {
  type: SchedulerEventType;
  task: TaskInstance;
  error?: string;
}

export type SchedulerCallback = (event: SchedulerEvent) => void | Promise<void>;

export class Scheduler {
  private _tasks = new Map<string, TaskInstance>();
  private _handlers = new Map<string, () => Promise<void> | void>();
  private _cronFields = new Map<string, CronFields>();
  private _timers = new Map<string, ReturnType<typeof setTimeout>>();
  private _listeners = new Map<SchedulerEventType, Set<SchedulerCallback>>();
  private _runningTasks = new Set<string>();
  private _logger: Logger;
  private _running = false;

  constructor() {
    this._logger = new Logger("scheduler", { level: "info" });
  }

  get tasks(): TaskInstance[] {
    return [...this._tasks.values()];
  }

  get count(): number {
    return this._tasks.size;
  }

  get running(): boolean {
    return this._running;
  }

  // ── 事件监听 ──────────────────────────────────────────────────────────────

  on(type: SchedulerEventType, callback: SchedulerCallback): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type)!.add(callback);

    return () => {
      this._listeners.get(type)?.delete(callback);
    };
  }

  private async _emit(type: SchedulerEventType, task: TaskInstance, error?: string): Promise<void> {
    const listeners = this._listeners.get(type);
    if (!listeners) return;

    const event: SchedulerEvent = { type, task, error };

    for (const callback of listeners) {
      try {
        await callback(event);
      } catch (err) {
        this._logger.error("Scheduler event callback error", {
          type,
          task: task.id,
          error: (err as Error).message,
        });
      }
    }
  }

  // ── 注册任务 ──────────────────────────────────────────────────────────────

  add(options: TaskOptions): string {
    // 验证 ID 格式
    if (options.name.includes(":") || options.plugin.includes(":")) {
      throw new Error("Task name and plugin cannot contain ':'");
    }

    // 验证互斥
    const hasCron = !!options.cron;
    const hasInterval = !!options.interval;
    const hasDelay = !!options.delay;

    if ((hasCron ? 1 : 0) + (hasInterval ? 1 : 0) + (hasDelay ? 1 : 0) > 1) {
      throw new Error("Only one of cron, interval, or delay can be set");
    }

    const id = options.plugin + ":" + options.name;

    if (this._tasks.has(id)) {
      throw new Error("Task already exists: " + id);
    }

    const now = Date.now();
    let nextRunAt: number | undefined;

    if (options.cron) {
      const fields = parseCron(options.cron);
      this._cronFields.set(id, fields);
      nextRunAt = getNextRunTime(fields, new Date()).getTime();
    }

    const task: TaskInstance = {
      id,
      name: options.name,
      plugin: options.plugin,
      cron: options.cron,
      interval: options.interval,
      delay: options.delay,
      description: options.description,
      status: "pending",
      createdAt: now,
      nextRunAt,
      runCount: 0,
    };

    this._tasks.set(id, task);
    this._handlers.set(id, options.handler);

    this._logger.debug("Registered task: " + id);

    if (this._running) {
      this._scheduleTask(id);

      if (options.immediate) {
        this._executeTask(id);
      }
    }

    return id;
  }

  remove(id: string): void {
    const task = this._tasks.get(id);
    if (!task) return;

    this._cancelTimer(id);
    this._tasks.delete(id);
    this._handlers.delete(id);
    this._cronFields.delete(id);
    this._runningTasks.delete(id);

    this._logger.debug("Removed task: " + id);
  }

  removeByPlugin(plugin: string): void {
    const ids = [...this._tasks.keys()].filter((id) => id.startsWith(plugin + ":"));
    for (const id of ids) {
      this.remove(id);
    }
  }

  // ── 控制任务 ──────────────────────────────────────────────────────────────

  pause(id: string): void {
    const task = this._tasks.get(id);
    if (!task || task.status === "paused") return;

    task.status = "paused";
    this._cancelTimer(id);
    this._emit("task:pause", task);
    this._logger.debug("Paused task: " + id);
  }

  resume(id: string): void {
    const task = this._tasks.get(id);
    if (!task || task.status !== "paused") return;

    task.status = "pending";
    this._scheduleTask(id);
    this._emit("task:resume", task);
    this._logger.debug("Resumed task: " + id);
  }

  trigger(id: string): void {
    this._executeTask(id);
  }

  /**
   * 重置失败任务为待执行状态
   */
  reset(id: string): void {
    const task = this._tasks.get(id);
    if (!task || task.status !== "failed") return;

    task.status = "pending";
    task.lastError = undefined;
    this._scheduleTask(id);
    this._logger.debug("Reset task: " + id);
  }

  // ── 查询 ──────────────────────────────────────────────────────────────────

  getTask(id: string): TaskInstance | undefined {
    return this._tasks.get(id);
  }

  getTasksByPlugin(plugin: string): TaskInstance[] {
    return this.tasks.filter((t) => t.plugin === plugin);
  }

  getStatus(): {
    total: number;
    running: number;
    paused: number;
    pending: number;
    failed: number;
    tasks: TaskInstance[];
  } {
    const tasks = this.tasks;
    return {
      total: tasks.length,
      running: tasks.filter((t) => t.status === "running").length,
      paused: tasks.filter((t) => t.status === "paused").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      tasks,
    };
  }

  // ── 启动/停止 ─────────────────────────────────────────────────────────────

  start(): void {
    if (this._running) return;

    this._running = true;

    for (const id of this._tasks.keys()) {
      this._scheduleTask(id);
    }

    this._logger.info("Scheduler started with " + this._tasks.size + " tasks");
  }

  stop(): void {
    if (!this._running) return;

    this._running = false;

    for (const id of this._timers.keys()) {
      this._cancelTimer(id);
    }

    this._logger.info("Scheduler stopped");
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  private _scheduleTask(id: string): void {
    const task = this._tasks.get(id);
    if (!task || task.status !== "pending") return;

    this._cancelTimer(id);

    const now = Date.now();

    if (task.delay) {
      const timer = setTimeout(() => {
        this._executeTask(id);
        this.remove(id);
      }, task.delay);
      this._timers.set(id, timer);
      task.nextRunAt = now + task.delay;
    } else if (task.cron) {
      const fields = this._cronFields.get(id);
      if (!fields) return;

      const nextRun = getNextRunTime(fields, new Date());
      const delay = nextRun.getTime() - now;

      const timer = setTimeout(() => {
        this._executeTask(id);
        if (this._running && this._tasks.has(id)) {
          this._scheduleTask(id);
        }
      }, delay);

      this._timers.set(id, timer);
      task.nextRunAt = nextRun.getTime();
    } else if (task.interval) {
      const timer = setInterval(() => {
        this._executeTask(id);
      }, task.interval);

      this._timers.set(id, timer);
      task.nextRunAt = now + task.interval;
    }
  }

  private async _executeTask(id: string): Promise<void> {
    const task = this._tasks.get(id);
    const handler = this._handlers.get(id);

    if (!task || !handler || task.status === "paused" || task.status === "failed") return;

    // 并发控制：跳过正在执行的任务
    if (this._runningTasks.has(id)) {
      this._logger.debug("Task already running, skipping: " + id);
      return;
    }

    this._runningTasks.add(id);
    task.status = "running";
    task.lastRunAt = Date.now();
    task.runCount++;

    this._emit("task:start", task);

    try {
      await handler();
      task.status = "pending";
      this._emit("task:complete", task);
      this._logger.debug("Task completed: " + id);
    } catch (err) {
      task.status = "failed";
      task.lastError = (err as Error).message;
      this._emit("task:fail", task, task.lastError);
      this._logger.error("Task failed: " + id, {
        error: task.lastError,
      });
    } finally {
      this._runningTasks.delete(id);
    }
  }

  private _cancelTimer(id: string): void {
    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer as ReturnType<typeof setTimeout>);
      clearInterval(timer as ReturnType<typeof setInterval>);
      this._timers.delete(id);
    }
  }
}

export function createScheduler(): Scheduler {
  return new Scheduler();
}
