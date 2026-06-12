# @myfinal/dian-shared

Dian V2 框架的共享类型定义，平台无关。

## 安装

```bash
npm install @myfinal/dian-shared
```

## 导出

### 品牌类型（ID 类型安全）

防止 userId / groupId / messageId 等 ID 混用：

```typescript
import { UserId, GroupId } from "@myfinal/dian-shared";

const uid = UserId("12345");
const gid = GroupId("67890");

// uid = gid; // ❌ 类型错误！
```

| 类型 | 说明 |
|------|------|
| `BotId` | 机器人 ID |
| `UserId` | 用户 ID |
| `GroupId` | 群组 ID |
| `ChannelId` | 频道 ID |
| `MessageId` | 消息 ID |
| `EventId` | 事件 ID |

### 事件类型

- `Platform` - 平台标识（string，由适配器注册）
- `BotEventType` - 事件大类
- `MessageType` - 消息类型（private / group）
- `SenderRole` - 发送者角色
- `Sender` - 发送者信息
- `BotEvent` - 统一事件对象
- `EventPayload` - 事件载荷

### 消息类型

- `MessageSegment` - 消息段基础结构
- `MessageContent` - 消息内容（文本或段数组）

### 通用类型

- `ActionResult` - API 调用结果
- `SendActionFn` - 发送函数类型
- `LogLevel` - 日志级别
- `AsyncFn` - 异步函数类型
- `Mutable` / `DeepPartial` / `Awaited` - 工具类型

## 设计原则

- **平台无关**：不包含任何 OneBot / 飞书 / Discord 等平台专属类型
- **类型安全**：使用品牌类型防止 ID 混用
- **适配器模式**：平台特定的类型和映射逻辑由适配器插件提供
- **最小依赖**：本包无运行时依赖
