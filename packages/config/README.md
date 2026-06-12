# @myfinal/dian-config

Dian V2 配置管理模块，支持 YAML 配置加载、Zod 校验、热重载。

## 安装

```bash
npm install @myfinal/dian-config
```

## 使用

### 基础用法

```typescript
import { createConfigService } from "@myfinal/dian-config";

const config = createConfigService({ configDir: "./config" });
config.init();

console.log(config.settings);  // Settings
console.log(config.bots);      // BotEntry[]
```

### 热重载

```typescript
config.watch();  // 开启文件监听

config.on("change", (event) => {
  console.log("配置变更:", event.file);
  console.log("新配置:", event.config);
});

config.on("error", (err) => {
  console.error("配置校验失败:", err.message);
});

await config.unwatch();  // 关闭监听
```

### 查询机器人配置

```typescript
// 获取所有机器人
const bots = config.bots;

// 根据 botId 查询
const bot = config.getBot("my-bot");
console.log(bot?.platform);  // "onebot"
console.log(bot?.options);   // 平台专属配置（由适配器定义）
```

### 脱敏（管理面板用）

```typescript
const safeConfig = config.redact();
// passwordHash, jwtSecret, accessToken 等字段已被替换为 "***"
```

### 手动加载配置

```typescript
import { loadAllConfig } from "@myfinal/dian-config";

const allConfig = loadAllConfig({ configDir: "./config" });
```

### 写入配置

```typescript
import { writeYamlFile } from "@myfinal/dian-config";

await writeYamlFile("./config/settings.yaml", settings);
```

## 配置文件

### settings.yaml

```yaml
logLevel: info           # trace | debug | info | warn | error | fatal

storage:
  sqlite: data/dian.db
  mysql: mysql://user:pass@localhost:3306/dian
  redis: redis://localhost:6379

auth:
  passwordHash: (bcrypt hash)
  jwtSecret: (留空则自动生成)
  tokenExpiresIn: 86400

httpsProxy: http://proxy:8080
```

### bot.yaml

```yaml
# 支持多种平台的多个机器人同时运行
bots:
  - botId: qq-bot
    enabled: true
    platform: onebot
    options:
      # OneBot 适配器定义的配置

  - botId: discord-bot
    enabled: true
    platform: discord
    options:
      # Discord 适配器定义的配置

  - botId: telegram-bot
    enabled: true
    platform: telegram
    options:
      # Telegram 适配器定义的配置
```

### templates.yaml

```yaml
# 消息模板（由插件定义和使用）
templates: {}
```

## 设计原则

- **平台无关**：bot.yaml 不包含任何平台专属配置
- **适配器模式**：平台专属配置（如 OneBot 的 ws/http）由适配器插件定义 schema 并校验
- **热重载**：配置变更自动重载，错误时保留上次有效配置

## API

### `createConfigService(options?)`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| options.configDir | `string` | `"config"` | 配置目录路径 |

### `ConfigService`

| 方法/属性 | 说明 |
|-----------|------|
| `init()` | 加载配置（失败则抛异常） |
| `config` | 获取完整配置 |
| `settings` | 获取 settings |
| `bots` | 获取所有机器人配置 |
| `getBot(botId)` | 根据 botId 查询机器人 |
| `watch()` | 开启热重载 |
| `unwatch()` | 关闭热重载 |
| `redact()` | 返回脱敏后的配置 |

### 事件

| 事件 | 说明 |
|------|------|
| `change` | 配置变更 `{ file, config }` |
| `error` | 配置校验失败 `Error` |
