# @myfinal/dian-event-bus

类型安全的事件总线（Pro 版），支持通配符、中间件、历史记录、异步迭代等功能。

## 安装

```bash
npm install @myfinal/dian-event-bus
```

## 使用

### 基础用法

```typescript
import { createEventBus } from "@myfinal/dian-event-bus";

interface AppEvents {
  "message": [string];
  "message:group": [string, groupId: string];
  "error": [Error];
  "user:login": [userId: string];
}

const bus = createEventBus<AppEvents>();

bus.on("message", (msg) => {
  console.log("收到:", msg);
});

bus.emit("message", "hello");
```

### 通配符订阅

```typescript
// 监听所有 message 事件
bus.on("message:*", (msg) => {
  console.log("任意消息:", msg);
});

// 监听所有事件
bus.on("*", (msg) => {
  console.log("任意事件");
});
```

### 优先级控制

```typescript
bus.on("message", handler1, { priority: 50 });   // 先执行
bus.on("message", handler2, { priority: 100 });  // 后执行
```

### 阻止传播

```typescript
bus.on("message", handler1, { stopPropagation: true });
bus.on("message", handler2);  // 不会执行
```

### 中间件

```typescript
bus.use(async (ctx, next) => {
  console.log("before:", ctx.type);
  await next();
  console.log("after:", ctx.type);
});
```

### 等待事件

```typescript
// 等待回复，5 秒超时
const reply = await bus.waitFor("reply", {
  timeout: 5000,
  filter: (msg) => msg.includes("hello"),
});
```

### 异步迭代

```typescript
// 流式处理事件
for await (const [msg] of bus.events("message")) {
  console.log(msg);
}
```

### 事件历史

```typescript
// 启用历史记录
const bus = createEventBus<AppEvents>({
  history: { enabled: true, maxSize: 1000 },
});

// 发射事件后查看历史
bus.emit("message", "hello");
const history = bus.getHistory("message");
console.log(history); // [{ type: "message", args: ["hello"], timestamp: ... }]
```

### 事件去重

```typescript
// 启用去重
const bus = createEventBus<AppEvents>({
  dedupe: {
    enabled: true,
    windowMs: 1000,  // 1 秒内相同 key 的事件只处理一次
    keyExtractor: (...args) => String(args[0]),
  },
});

// 多次发射相同事件，只处理一次
bus.emit("message", "hello");
bus.emit("message", "hello");  // 被去重，不处理
```

### 插件作用域

```typescript
import { createPluginBus } from "@myfinal/dian-event-bus";

const bus = createPluginBus<AppEvents>("my-plugin");

bus.on("message", handler);

// 插件卸载时清理
bus.dispose();
```

## API

### `createEventBus<T>(options?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| options.history | `EventHistoryConfig` | 历史记录配置 |
| options.dedupe | `DedupeConfig` | 去重配置 |

### `EventEmitter`

| 方法 | 说明 |
|------|------|
| `on(event, listener, options?)` | 注册监听器 |
| `once(event, listener, options?)` | 注册一次性监听器 |
| `off(event, listener?)` | 移除监听器 |
| `emit(event, ...args)` | 发射事件 |
| `waitFor(event, options?)` | 等待事件 |
| `events(event)` | 异步迭代器 |
| `getHistory(event?)` | 获取历史记录 |
| `clearHistory()` | 清空历史 |
| `clear(event?)` | 清理监听器 |
| `listenerCount(event)` | 监听器数量 |
| `eventNames()` | 已注册的事件名 |

### `ListenerOptions`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| priority | `number` | `100` | 优先级，数字越小越先执行 |
| stopPropagation | `boolean` | `false` | 是否阻止后续传播 |

### `WaitForOptions`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| timeout | `number` | `5000` | 超时时间（毫秒） |
| filter | `function` | - | 过滤函数 |

### `EventHistoryConfig`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | `boolean` | `false` | 是否启用 |
| maxSize | `number` | `100` | 最大记录数量 |

### `DedupeConfig`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | `boolean` | `false` | 是否启用 |
| keyExtractor | `function` | - | 去重 key 提取函数 |
| windowMs | `number` | `1000` | 去重窗口（毫秒） |
