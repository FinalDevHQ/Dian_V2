// @myfinal/dian-event-bus - 类型安全的事件总线（Pro 版）

// 类型
export type {
  EventMap,
  ListenerOptions,
  EventListener,
  MiddlewareContext,
  Middleware,
  WaitForOptions,
  EventHistoryEntry,
  EventHistoryConfig,
  DedupeConfig,
} from "./types.js";

// EventEmitter
export { EventEmitter } from "./emitter.js";

// MiddlewareEventBus
export { MiddlewareEventBus, createEventBus } from "./middleware.js";

// PluginEventBus
export { PluginEventBus, createPluginBus } from "./plugin-bus.js";
