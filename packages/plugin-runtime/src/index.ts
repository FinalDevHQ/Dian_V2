import "reflect-metadata";

// @myfinal/dian-plugin-runtime - Pro 版插件管理系统

// 类型
export type {
  PluginMeta,
  Pattern,
  HandlerMeta,
  InterceptorMeta,
  EventContext,
  PluginInstance,
  PluginDefinition,
  PluginHandler,
  PluginInterceptor,
  PluginSetupContext,
  PluginPermission,
  PluginPermissions,
  PluginSandbox,
  DependencyCheckResult,
} from "./types.js";

export {
  PLUGIN_META_KEY,
  HANDLER_META_KEY,
  INTERCEPTOR_META_KEY,
} from "./types.js";

// 装饰器
export { Plugin, Handler, Interceptor } from "./decorators.js";
export { getPluginMeta, getHandlerMeta, getInterceptorMeta } from "./decorators.js";

// 管理器
export { PluginManager, createPluginManager } from "./manager.js";

// 分发器
export { dispatchEvent } from "./dispatcher.js";
export type { DispatchResult } from "./dispatcher.js";

// 沙箱
export { PluginSandboxManager, createEventContext } from "./sandbox.js";

// 依赖检查
export {
  checkDependencies,
  checkAllDependencies,
  getStartupOrder,
} from "./dependencies.js";
