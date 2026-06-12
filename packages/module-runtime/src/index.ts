// @myfinal/dian-module-runtime - Pro 版模块管理系统

// 类型
export type {
  Module,
  ModuleInstance,
  ModuleContext,
  ModuleStatus,
  ModuleManagerConfig,
} from "./types.js";

// 模块管理器
export { ModuleManager, createModuleManager } from "./manager.js";

// 工具函数
export { isModule } from "./types.js";
