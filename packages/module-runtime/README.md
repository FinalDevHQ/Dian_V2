# @myfinal/dian-module-runtime

Pro 版模块管理系统，支持依赖注入、生命周期钩子、健康检查等功能。

## 安装

```bash
npm install @myfinal/dian-module-runtime
```

## 使用

### 定义模块

```typescript
import type { Module, ModuleContext } from "@myfinal/dian-module-runtime";

interface MyModuleConfig {
  apiKey: string;
}

const MyModule: Module<MyModuleConfig> = {
  name: "my-module",
  description: "我的模块",
  dependencies: ["config"],

  async setup(ctx: ModuleContext<MyModuleConfig>) {
    ctx.logger.info("模块启动", { apiKey: ctx.config.apiKey });
    // 初始化逻辑
  },

  async teardown(ctx: ModuleContext) {
    ctx.logger.info("模块停止");
    // 清理逻辑
  },

  async onReady(ctx: ModuleContext) {
    ctx.logger.info("模块就绪");
    // 所有模块启动完成后的回调
  },

  async onConfigChange(ctx, newConfig) {
    ctx.logger.info("配置变更", { newConfig });
  },

  async healthCheck(ctx) {
    return true; // 返回 true 表示健康
  },
};
```

### 创建模块管理器

```typescript
import { createModuleManager } from "@myfinal/dian-module-runtime";

const manager = createModuleManager({
  modulesDir: "./modules",
  startupTimeout: 30000,
  healthCheck: true,
  healthCheckInterval: 60000,
});
```

### 手动注册模块

```typescript
manager.register(MyModule);
```

### 发现模块

```typescript
// 从目录自动发现模块
await manager.discover("./modules");
```

### 启动/停止

```typescript
// 启动所有模块（按依赖顺序）
await manager.startAll();

// 停止所有模块（反向顺序）
await manager.stopAll();
```

### 监听事件

```typescript
manager.events.on("module:started", (name) => {
  console.log(`模块 ${name} 已启动`);
});

manager.events.on("module:stopped", (name) => {
  console.log(`模块 ${name} 已停止`);
});

manager.events.on("module:unhealthy", (name) => {
  console.warn(`模块 ${name} 健康检查失败`);
});
```

### 获取模块实例

```typescript
const instance = manager.modules.find(m => m.module.name === "my-module");
console.log(instance?.status); // "running"
```

## 模块目录结构

```
modules/
├── config/
│   └── index.js      # 导出 Module 对象
├── storage/
│   └── index.js
└── my-plugin/
    └── index.js
```

每个模块文件需要 `export default` 导出一个符合 `Module` 接口的对象。

## API

### `createModuleManager(config?)`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| config.modulesDir | `string` | `"modules"` | 模块目录路径 |
| config.startupTimeout | `number` | `30000` | 启动超时时间（毫秒） |
| config.healthCheck | `boolean` | `false` | 是否启用健康检查 |
| config.healthCheckInterval | `number` | `60000` | 健康检查间隔（毫秒） |

### `ModuleManager`

| 方法/属性 | 说明 |
|-----------|------|
| `register(module)` | 注册模块 |
| `discover(dir?)` | 从目录发现模块 |
| `startAll()` | 启动所有模块 |
| `stopAll()` | 停止所有模块 |
| `modules` | 获取所有模块实例 |
| `count` | 模块数量 |
| `events` | 事件总线 |

### `Module<TConfig>`

| 字段/方法 | 类型 | 说明 |
|-----------|------|------|
| name | `string` | 模块名称（唯一） |
| description | `string?` | 模块描述 |
| dependencies | `string[]?` | 依赖的模块 |
| version | `string?` | 模块版本 |
| setup(ctx) | `async` | 启动模块 |
| teardown(ctx) | `async` | 停止模块 |
| onReady(ctx) | `async?` | 所有模块启动完成后的回调 |
| onConfigChange(ctx, config) | `async?` | 配置变更回调 |
| healthCheck(ctx) | `async?` | 健康检查 |

### `ModuleContext<TConfig>`

| 字段 | 类型 | 说明 |
|------|------|------|
| name | `string` | 模块名称 |
| config | `TConfig` | 模块配置 |
| logger | `ChildLogger` | 日志器 |
| events | `MiddlewareEventBus` | 事件总线 |
| dependencies | `Map<string, ModuleInstance>` | 依赖的模块 |
| getModule(name) | `function` | 获取其他模块实例 |

### `ModuleInstance`

| 字段 | 类型 | 说明 |
|------|------|------|
| module | `Module` | 模块定义 |
| status | `ModuleStatus` | 当前状态 |
| startedAt | `number?` | 启动时间 |
| error | `Error?` | 错误信息 |

### `ModuleStatus`

`"pending"` | `"starting"` | `"running"` | `"stopping"` | `"stopped"` | `"error"`

### 事件

| 事件 | 说明 |
|------|------|
| `modules:started` | 所有模块启动完成 |
| `modules:stopped` | 所有模块停止完成 |
| `module:started` | 单个模块启动完成 |
| `module:stopped` | 单个模块停止完成 |
| `module:unhealthy` | 模块健康检查失败 |
