# @myfinal/dian-plugin-runtime

Pro 版插件管理系统，支持沙箱隔离、权限控制、依赖检查、热重载等功能。

## 安装

```bash
npm install @myfinal/dian-plugin-runtime
```

## 使用

### 装饰器模式

```typescript
import {
  Plugin,
  Handler,
  Interceptor,
  createPluginManager,
  type EventContext,
  type PluginPermission,
} from "@myfinal/dian-plugin-runtime";

@Plugin({
  name: "greet",
  description: "问候插件",
  version: "1.0.0",
  permissions: ["reply", "sendAction"],
})
class GreetPlugin {
  @Handler(/hello/i)
  async onHello(ctx: EventContext) {
    if (!ctx.hasPermission("reply")) {
      throw new Error("没有回复权限");
    }
    await ctx.reply("Hello!");
  }
}
```

### 函数式模式

```typescript
import {
  createPluginManager,
  type PluginDefinition,
} from "@myfinal/dian-plugin-runtime";

const greetPlugin: PluginDefinition = {
  meta: {
    name: "greet",
    version: "1.0.0",
    permissions: ["reply"],
  },

  handlers: [
    {
      pattern: /hello/i,
      handler: async (ctx) => {
        await ctx.reply("Hello!");
      },
    },
  ],

  onSetup: async (ctx) => {
    ctx.logger.info("插件启动");
  },
};
```

### 沙箱和权限

```typescript
// 设置插件权限
manager.setPermissions("greet", ["reply", "sendAction"]);

// 检查权限
const hasPermission = manager.hasPermission("greet", "reply");

// 在事件上下文中检查
@Handler(/hello/i)
async onHello(ctx: EventContext) {
  if (!ctx.hasPermission("sendAction")) {
    ctx.logger.warn("没有发送权限");
    return;
  }
  await ctx.sendAction("send_msg", { message: "Hello!" });
}
```

### 依赖管理

```typescript
@Plugin({
  name: "greet",
  dependencies: ["config", "logger"],
  minDeps: { config: "^1.0.0" },
})
class GreetPlugin { ... }

// 检查依赖
const result = manager.checkDependencies("greet");
if (!result.ok) {
  console.log("缺失依赖:", result.missing);
  console.log("版本不匹配:", result.versionMismatch);
}

// 获取启动顺序
const order = manager.getStartupOrder();
console.log(order); // ["config", "logger", "greet"]
```

### 事件分发（带权限）

```typescript
await manager.dispatch(event, {
  reply: async (text) => { ... },
  sendAction: async (action, params) => { ... },
});
```

## API

### `createPluginManager()`

创建插件管理器实例。

### `PluginManager`

| 方法 | 说明 |
|------|------|
| `register(instance)` | 注册插件 |
| `registerDefinition(def)` | 注册插件定义 |
| `loadAll(dir)` | 从目录加载插件 |
| `loadFromPath(path)` | 从路径加载单个插件 |
| `unload(name)` | 卸载插件 |
| `watch(dir)` | 开启热重载 |
| `unwatch()` | 关闭热重载 |
| `dispatch(event, options)` | 分发事件 |
| `setPermissions(name, perms)` | 设置插件权限 |
| `hasPermission(name, perm)` | 检查插件权限 |
| `checkDependencies(name)` | 检查插件依赖 |
| `checkAllDependencies()` | 检查所有依赖 |
| `getStartupOrder()` | 获取启动顺序 |
| `addToBlacklist(name)` | 加入黑名单 |
| `removeFromBlacklist(name)` | 移出黑名单 |
| `setMaintenanceMode(enabled)` | 设置维护模式 |
| `listMeta()` | 获取插件元数据列表 |
| `getPlugin(name)` | 获取单个插件 |

### `PluginMeta`

| 字段 | 类型 | 说明 |
|------|------|------|
| name | `string` | 插件名称（唯一） |
| description | `string?` | 插件描述 |
| version | `string?` | 插件版本 |
| author | `string?` | 作者 |
| icon | `string?` | 图标 |
| dependencies | `string[]?` | 依赖的插件 |
| permissions | `PluginPermission[]?` | 所需权限 |
| minDeps | `Record<string, string>?` | 最低依赖版本 |

### `PluginPermission`

`"sendAction"` | `"reply"` | `"store"` | `"config"` | `"events"` | `"http"` | `"filesystem"`

### `EventContext`

| 字段 | 说明 |
|------|------|
| `event` | 原始事件 |
| `pluginName` | 插件名称 |
| `stopPropagation()` | 停止传播 |
| `reply(text)` | 回复消息（需要权限） |
| `sendAction(action, params?)` | 发送动作（需要权限） |
| `hasPermission(perm)` | 检查权限 |

### 依赖检查结果

```typescript
interface DependencyCheckResult {
  ok: boolean;
  missing: string[];
  versionMismatch: { name: string; required: string; actual: string }[];
}
```
