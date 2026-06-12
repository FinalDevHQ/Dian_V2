# @myfinal/dian-storage

SQLite 存储模块（Pro 版），提供日志、消息、插件数据存储，支持迁移、事务、监听、备份等功能。

## 安装

```bash
npm install @myfinal/dian-storage
```

## 使用

### 初始化

```typescript
import { createStorageService } from "@myfinal/dian-storage";

const storage = createStorageService();
await storage.init({ sqlite: "data/storage.db" });
```

### 日志存储

```typescript
// 写入日志
storage.log.write({
  botId: "bot-001",
  level: "info",
  message: "用户发送消息",
  meta: { userId: "12345" },
});

// 查询日志
const logs = storage.log.query({
  botId: "bot-001",
  level: "info",
  limit: 100,
});

// 清理 30 天前的日志
const deleted = storage.log.cleanup(30);
```

### 消息存储

```typescript
// 写入消息（自动去重）
storage.message.writeMessage({
  eventId: "bot-001:12345",
  botId: "bot-001",
  subtype: "message.group",
  groupId: "group-001",
  userId: "user-001",
  senderName: "张三",
  text: "Hello!",
  timestamp: Date.now() / 1000,
});

// 查询消息
const { total, items } = storage.message.queryMessages({
  botId: "bot-001",
  keyword: "Hello",
  limit: 50,
});

// 统计
const stats = storage.message.overviewStats({ botId: "bot-001" });
const groups = storage.message.groupStats();
const users = storage.message.userStats();
const trend = storage.message.trendStats();
```

### 插件存储

```typescript
// 创建表
storage.pluginStore.createTable("my_data", ["key", "value"]);

// 插入数据
storage.pluginStore.insert("my_data", { key: "name", value: "张三" });

// 查询数据
const rows = storage.pluginStore.query("my_data", { key: "name" });

// 删除数据
storage.pluginStore.delete("my_data", { key: "name" });
```

### 迁移系统

```typescript
// 定义迁移
const migrations = [
  {
    version: 1,
    up: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`,
    down: `DROP TABLE users`,
  },
  {
    version: 2,
    up: `ALTER TABLE users ADD COLUMN email TEXT`,
    down: `ALTER TABLE users DROP COLUMN email`,
  },
];

// 执行迁移
storage.migrate(migrations);

// 查看当前版本
const version = storage.migration.getCurrentVersion();
```

### 事务

```typescript
// 原子操作
await storage.transaction.transaction(async (ctx) => {
  ctx.log.write({ botId: "bot-001", level: "info", message: "msg1" });
  ctx.log.write({ botId: "bot-001", level: "info", message: "msg2" });
  // 如果出错，上面两条都不会写入
});

// 批量操作
await storage.transaction.batch(items, async (item, ctx) => {
  ctx.message.writeMessage(item);
});
```

### 监听变更

```typescript
// 监听消息写入
storage.watch.on("messages", (event) => {
  console.log("新消息:", event);
});

// 监听日志写入
storage.watch.on("logs", (event) => {
  if (event.type === "insert") {
    console.log("新日志:", event.data);
  }
});

// 取消监听
const unsub = storage.watch.on("messages", handler);
unsub();
```

### 备份恢复

```typescript
// 备份
storage.backupTo("./backups/storage-2024-01-01.db");

// 导出为 Buffer
const buffer = storage.backup.exportBuffer();
```

### 关闭

```typescript
storage.close();
```

## API

### `createStorageService()`

创建存储服务实例。

### `StorageService`

| 方法/属性 | 说明 |
|-----------|------|
| `init(options)` | 初始化存储 |
| `log` | 日志仓库 |
| `message` | 消息仓库 |
| `pluginStore` | 插件存储 |
| `migration` | 迁移管理器 |
| `transaction` | 事务管理器 |
| `backup` | 备份管理器 |
| `watch` | 监听管理器 |
| `migrate(migrations)` | 执行迁移 |
| `cleanup(days?)` | 清理过期日志 |
| `backupTo(path)` | 备份数据库 |
| `close()` | 关闭所有连接 |

### `Migration`

| 字段 | 类型 | 说明 |
|------|------|------|
| version | `number` | 版本号 |
| up | `string` | 升级 SQL |
| down | `string` | 回滚 SQL |

### `WatchEvent`

| 字段 | 类型 | 说明 |
|------|------|------|
| type | `WatchEventType` | 事件类型 (insert/update/delete) |
| table | `string` | 表名 |
| data | `T` | 数据 |
| timestamp | `number` | 时间戳 |

## 数据库特性

- **WAL 模式**：支持并发读写
- **自动去重**：消息基于 `event_id` 去重
- **事务支持**：原子操作，数据一致性
- **迁移系统**：Schema 版本管理
- **变更监听**：实时感知数据变化
- **备份恢复**：数据安全保障
