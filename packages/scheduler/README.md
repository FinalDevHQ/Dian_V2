# @myfinal/dian-scheduler

定时任务调度器，供插件使用，支持 Cron 表达式、间隔、延迟任务。

## 安装

```bash
npm install @myfinal/dian-scheduler
```

## 使用

### 基础用法

```typescript
import { createScheduler } from "@myfinal/dian-scheduler";

const scheduler = createScheduler();

// Cron 任务（每5分钟）
scheduler.add({
  name: "cleanup",
  plugin: "my-plugin",
  cron: "0 */5 * * * *",
  handler: async () => {
    console.log("清理完成");
  },
});

// 间隔任务（每30秒）
scheduler.add({
  name: "sync",
  plugin: "my-plugin",
  interval: 30000,
  handler: async () => {
    console.log("同步完成");
  },
});

// 延迟任务（5秒后执行一次）
scheduler.add({
  name: "delayed",
  plugin: "my-plugin",
  delay: 5000,
  handler: async () => {
    console.log("延迟任务完成");
  },
});

// 启动调度器
scheduler.start();
```

### Cron 表达式

格式：`秒 分 时 日 月 周`

```typescript
// 每分钟的第0秒
"0 * * * * *"

// 每5分钟
"0 */5 * * * *"

// 每天凌晨3点
"0 0 3 * * *"

// 每周一上午9点
"0 0 9 * * 1"

// 每月1号午夜
"0 0 0 1 * *"
```

### 任务管理

```typescript
// 暂停任务
scheduler.pause("my-plugin:cleanup");

// 恢复任务
scheduler.resume("my-plugin:cleanup");

// 移除任务
scheduler.remove("my-plugin:cleanup");

// 手动触发
scheduler.trigger("my-plugin:cleanup");

// 获取任务状态
const task = scheduler.getTask("my-plugin:cleanup");
console.log(task?.status); // "pending" | "running" | "paused" | "failed"

// 获取插件的所有任务
const tasks = scheduler.getTasksByPlugin("my-plugin");

// 获取所有任务状态（Web 面板用）
const status = scheduler.getStatus();
console.log(status);
// {
//   total: 5,
//   running: 1,
//   paused: 2,
//   pending: 2,
//   tasks: [...]
// }
```

### 在插件中使用

```typescript
import { Plugin, Handler, type EventContext } from "@myfinal/dian-plugin-runtime";
import { createScheduler } from "@myfinal/dian-scheduler";

const scheduler = createScheduler();

@Plugin({ name: "my-plugin" })
class MyPlugin {
  async onSetup(ctx) {
    // 注册定时任务
    scheduler.add({
      name: "daily-report",
      plugin: "my-plugin",
      cron: "0 0 9 * * *",
      description: "每天早上9点发送日报",
      handler: async () => {
        await ctx.events.emit("send:message", "日报内容");
      },
    });

    scheduler.start();
  }

  async onStop() {
    // 移除插件的所有任务
    scheduler.removeByPlugin("my-plugin");
  }
}
```

## API

### `createScheduler()`

创建调度器实例。

### `Scheduler`

| 方法 | 说明 |
|------|------|
| `add(options)` | 注册任务，返回任务 ID |
| `remove(id)` | 移除任务 |
| `removeByPlugin(plugin)` | 移除插件的所有任务 |
| `pause(id)` | 暂停任务 |
| `resume(id)` | 恢复任务 |
| `trigger(id)` | 手动触发任务 |
| `getTask(id)` | 获取任务信息 |
| `getTasksByPlugin(plugin)` | 获取插件的任务 |
| `getStatus()` | 获取所有任务状态（Web 面板用） |
| `start()` | 启动调度器 |
| `stop()` | 停止调度器 |
| `tasks` | 获取所有任务 |
| `count` | 任务数量 |

### `TaskOptions`

| 字段 | 类型 | 说明 |
|------|------|------|
| name | `string` | 任务名称 |
| plugin | `string` | 所属插件 |
| cron | `string?` | Cron 表达式 |
| interval | `number?` | 间隔毫秒数 |
| delay | `number?` | 延迟毫秒数 |
| immediate | `boolean?` | 是否立即执行一次 |
| handler | `function` | 任务处理函数 |
| description | `string?` | 描述 |

### `TaskInstance`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `string` | 任务 ID |
| name | `string` | 任务名称 |
| plugin | `string` | 所属插件 |
| status | `TaskStatus` | 任务状态 |
| createdAt | `number` | 创建时间 |
| lastRunAt | `number?` | 上次执行时间 |
| nextRunAt | `number?` | 下次执行时间 |
| runCount | `number` | 执行次数 |
| lastError | `string?` | 最后错误 |

### `TaskStatus`

`"pending"` | `"running"` | `"paused"` | `"completed"` | `"failed"`
