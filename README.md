# Dian V2

Dian V2 是一个模块化的 Bot 框架，支持多平台、插件化、事件驱动架构。

## 特性

- **平台无关**：通过适配器插件支持 OneBot、飞书、Discord、Telegram 等
- **模块化**：每个功能都是独立的包，可按需使用
- **插件系统**：支持装饰器和函数式两种插件定义方式
- **事件驱动**：类型安全的事件总线，支持中间件、优先级、通配符
- **存储层**：SQLite 存储，支持迁移、事务、监听、备份
- **热重载**：插件和配置支持热重载

## 包结构

```
packages/
├── shared/           # 共享类型定义
├── logger/           # 日志系统
├── config/           # 配置管理
├── event-bus/        # 事件总线
├── module-runtime/   # 模块系统
├── plugin-runtime/   # 插件系统
└── storage/          # 存储层
```

## 快速开始

### 安装

```bash
npm install @myfinal/dian-shared @myfinal/dian-logger @myfinal/dian-config @myfinal/dian-event-bus @myfinal/dian-module-runtime @myfinal/dian-plugin-runtime @myfinal/dian-storage
```

### 基础用法

```typescript
import { createLogger } from "@myfinal/dian-logger";
import { createConfigService } from "@myfinal/dian-config";
import { createEventBus } from "@myfinal/dian-event-bus";
import { createModuleManager } from "@myfinal/dian-module-runtime";
import { createPluginManager } from "@myfinal/dian-plugin-runtime";
import { createStorageService } from "@myfinal/dian-storage";

// 1. 初始化日志
const logger = createLogger("app", { level: "debug", pretty: true });

// 2. 加载配置
const config = createConfigService({ configDir: "./config" });
config.init();

// 3. 初始化存储
const storage = createStorageService();
await storage.init({ sqlite: "data/storage.db" });

// 4. 创建事件总线
const events = createEventBus();

// 5. 创建模块管理器
const moduleManager = createModuleManager();
await moduleManager.discover("./modules");
await moduleManager.startAll();

// 6. 创建插件管理器
const pluginManager = createPluginManager();
await pluginManager.loadAll("./plugins");
```

## 各包详解

### @myfinal/dian-shared

共享类型定义，平台无关。

```typescript
import { UserId, GroupId, type BotEvent } from "@myfinal/dian-shared";

// 品牌类型防止 ID 混用
const uid = UserId("12345");
const gid = GroupId("67890");
// uid = gid; // ❌ 类型错误
```

**主要类型**：
- `BotEvent` - 统一事件对象
- `EventPayload` - 事件载荷
- `UserId`, `GroupId`, `MessageId` - 品牌类型
- `ActionResult` - API 调用结果
- `MessageSegment` - 消息段

---

### @myfinal/dian-logger

基于 pino 的日志系统。

```typescript
import { createLogger } from "@myfinal/dian-logger";

const logger = createLogger("app", { level: "debug", pretty: true });

logger.info("应用启动");
logger.debug("调试信息", { key: "value" });

// 子 logger
const botLogger = logger.child({ botId: "bot-001" });
botLogger.info("机器人连接");

// 带前缀
const pluginLogger = logger.withPrefix("plugin:greet");
pluginLogger.info("插件加载");

// 开关控制
logger.disable(); // 关闭日志
logger.enable();  // 重新开启
```

**功能**：
- 6 个日志级别：trace, debug, info, warn, error, fatal
- 子 logger 和前缀支持
- 全局/独立开关控制
- 动态修改日志级别

---

### @myfinal/dian-config

配置管理，支持 YAML、Zod 校验、热重载。

```typescript
import { createConfigService } from "@myfinal/dian-config";

const config = createConfigService({ configDir: "./config" });
config.init();

// 访问配置
console.log(config.settings.logLevel);
console.log(config.bots);
console.log(config.getBot("my-bot")?.options);

// 热重载
config.watch();
config.on("change", (event) => {
  console.log("配置变更:", event.file);
});

// 脱敏
const safeConfig = config.redact();
```

**配置文件**：
- `settings.yaml` - 通用设置
- `bot.yaml` - 机器人配置（平台无关）
- `templates.yaml` - 消息模板

---

### @myfinal/dian-event-bus

类型安全的事件总线。

```typescript
import { createEventBus, createPluginBus } from "@myfinal/dian-event-bus";

interface AppEvents {
  "message": [string];
  "message:group": [string, groupId: string];
  "error": [Error];
}

const bus = createEventBus<AppEvents>();

// 监听
bus.on("message", (msg) => console.log(msg));

// 通配符
bus.on("message:*", (msg) => console.log("任意消息:", msg));

// 中间件
bus.use(async (ctx, next) => {
  console.log("before:", ctx.type);
  await next();
  console.log("after:", ctx.type);
});

// 等待事件
const reply = await bus.waitFor("reply", { timeout: 5000 });

// 异步迭代
for await (const [msg] of bus.events("message")) {
  console.log(msg);
}

// 事件历史
const history = bus.getHistory("message");

// 插件作用域
const pluginBus = createPluginBus<AppEvents>("my-plugin");
pluginBus.on("message", handler);
pluginBus.dispose(); // 卸载时清理
```

**功能**：
- 类型安全的泛型事件系统
- 通配符订阅（message:*）
- 中间件支持
- 优先级控制
- 事件历史记录
- 异步迭代器
- 事件去重
- 插件作用域

---

### @myfinal/dian-module-runtime

模块管理系统。

```typescript
import { createModuleManager, type Module } from "@myfinal/dian-module-runtime";

const MyModule: Module<{ apiKey: string }> = {
  name: "my-module",
  description: "我的模块",
  dependencies: ["config"],

  async setup(ctx) {
    ctx.logger.info("启动", { apiKey: ctx.config.apiKey });
  },

  async teardown(ctx) {
    ctx.logger.info("停止");
  },

  async onReady(ctx) {
    ctx.logger.info("就绪");
  },

  async healthCheck(ctx) {
    return true;
  },
};

const manager = createModuleManager({ healthCheck: true });
manager.register(MyModule);
await manager.startAll();
```

**功能**：
- 依赖注入和拓扑排序
- 生命周期钩子（setup, onReady, teardown）
- 健康检查
- 配置变更回调
- 事件驱动

---

### @myfinal/dian-plugin-runtime

插件管理系统。

```typescript
import {
  Plugin,
  Handler,
  Interceptor,
  createPluginManager,
  type EventContext,
} from "@myfinal/dian-plugin-runtime";

// 装饰器模式
@Plugin({
  name: "greet",
  version: "1.0.0",
  permissions: ["reply", "sendAction"],
  dependencies: ["config"],
})
class GreetPlugin {
  @Handler(/hello/i)
  async onHello(ctx: EventContext) {
    await ctx.reply("Hello!");
  }

  @Interceptor(50)
  async checkAuth(ctx: EventContext) {
    if (!ctx.hasPermission("reply")) {
      ctx.stopPropagation();
    }
  }
}

// 函数式模式
const greetPlugin = {
  meta: { name: "greet", version: "1.0.0" },
  handlers: [
    { pattern: /hello/i, handler: async (ctx) => ctx.reply("Hello!") },
  ],
  onSetup: async (ctx) => ctx.logger.info("启动"),
};

const manager = createPluginManager();
await manager.loadAll("./plugins");
```

**功能**：
- 装饰器和函数式两种模式
- 插件沙箱和权限控制
- 依赖检查和版本管理
- 热重载
- 事件分发流水线

---

### @myfinal/dian-storage

SQLite 存储系统。

```typescript
import { createStorageService } from "@myfinal/dian-storage";

const storage = createStorageService();
await storage.init({ sqlite: "data/storage.db" });

// 日志存储
storage.log.write({ botId: "bot-001", level: "info", message: "Hello" });
const logs = storage.log.query({ botId: "bot-001" });

// 消息存储
storage.message.writeMessage({
  eventId: "bot-001:12345",
  botId: "bot-001",
  subtype: "message.group",
  text: "Hello!",
  timestamp: Date.now() / 1000,
});
const stats = storage.message.overviewStats();

// 插件存储
storage.pluginStore.createTable("my_data", ["key", "value"]);
storage.pluginStore.insert("my_data", { key: "name", value: "张三" });

// 迁移
storage.migrate([
  { version: 1, up: "CREATE TABLE ...", down: "DROP TABLE ..." },
]);

// 事务
await storage.transaction.transaction(async (ctx) => {
  ctx.log.write({ ... });
});

// 监听
storage.watch.on("messages", (event) => {
  console.log("新消息:", event);
});

// 备份
storage.backupTo("./backups/backup.db");
```

**功能**：
- 日志、消息、插件数据存储
- 迁移系统
- 事务支持
- 变更监听
- 备份恢复

## 示例：创建一个问候插件

```typescript
// plugins/greet/index.ts
import {
  Plugin,
  Handler,
  type EventContext,
} from "@myfinal/dian-plugin-runtime";

@Plugin({
  name: "greet",
  description: "问候插件",
  version: "1.0.0",
  permissions: ["reply"],
})
export class GreetPlugin {
  @Handler(/hello/i)
  async onHello(ctx: EventContext) {
    await ctx.reply("Hello! 👋");
  }

  @Handler(/bye/i)
  async onBye(ctx: EventContext) {
    await ctx.reply("Goodbye! 👋");
  }

  @Handler(/^\/help$/)
  async onHelp(ctx: EventContext) {
    await ctx.reply("可用命令:\n- hello: 打招呼\n- bye: 告别");
  }
}
```

## 示例：创建一个模块

```typescript
// modules/config/index.ts
import type { Module } from "@myfinal/dian-module-runtime";

export default {
  name: "config",
  description: "配置管理模块",

  async setup(ctx) {
    ctx.logger.info("配置模块启动");
    // 初始化配置
  },

  async teardown(ctx) {
    ctx.logger.info("配置模块停止");
  },
} satisfies Module;
```

## 开发

```bash
# 安装依赖
npm install

# 构建所有包
npm run build

# 开发模式（监听变更）
npm run dev
```

## 许可证

MIT
