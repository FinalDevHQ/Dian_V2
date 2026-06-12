# @myfinal/dian-logger

基于 [pino](https://getpino.io/) 的日志模块，提供结构化日志能力。

## 安装

```bash
npm install @myfinal/dian-logger
```

## 使用

### 基础用法

```typescript
import { createLogger } from "@myfinal/dian-logger";

const logger = createLogger("app", { level: "debug", pretty: true });

logger.info("应用启动");
logger.debug("加载配置", { path: "./config.yaml" });
logger.error("连接失败", { host: "localhost", port: 3306 });
```

### 全局开关

```typescript
logger.disable();  // 关闭所有日志
logger.enable();   // 重新开启
```

### 动态修改级别

```typescript
logger.setLevel("debug");  // 运行时改为 debug
console.log(logger.level); // "debug"
```

### 插件独立控制

```typescript
const pluginLogger = logger.withPrefix("plugin:onebot");

pluginLogger.info("loaded");   // ✅ 输出
pluginLogger.disable();        // 只关闭这个插件的日志
pluginLogger.info("ignored");  // ❌ 不输出

logger.info("still works");   // ✅ 父 logger 不受影响
pluginLogger.enable();        // 重新开启
```

### 子 Logger（bindings）

```typescript
const botLogger = logger.child({ botId: "bot-001", platform: "onebot" });
botLogger.info("已连接"); // 自动附加 botId, platform
```

## API

### `createLogger(name, options?)`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| name | `string` | - | 模块名称 |
| options.level | `LogLevel` | `"info"` | 日志级别 |
| options.enabled | `boolean` | `true` | 是否启用 |
| options.pretty | `boolean` | `false` | pretty 输出 |
| options.logFile | `string` | - | 日志文件路径 |

### `Logger`

| 方法 | 说明 |
|------|------|
| `enable()` | 启用日志 |
| `disable()` | 禁用日志 |
| `setLevel(level)` | 动态修改级别 |
| `child(bindings)` | 创建子 logger |
| `withPrefix(prefix)` | 创建带前缀的子 logger |

### `ChildLogger`

与 `Logger` 相同的方法，但 `enable/disable` **独立于父 logger**。

## 日志级别

`trace` < `debug` < `info` < `warn` < `error` < `fatal`
