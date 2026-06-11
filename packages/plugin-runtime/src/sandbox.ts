import type { ChildLogger } from "@myfinal/dian-logger";
import type { MiddlewareEventBus } from "@myfinal/dian-event-bus";
import type {
  PluginPermission,
  PluginPermissions,
  PluginSandbox,
  PluginInstance,
  EventContext,
} from "./types.js";

// ---------------------------------------------------------------------------
// PluginSandboxManager - 插件沙箱管理器
// ---------------------------------------------------------------------------

export class PluginSandboxManager {
  private _sandbox = new Map<string, PluginSandbox>();
  private _permissions = new Map<string, PluginPermissions>();

  /**
   * 创建插件沙箱
   */
  createSandbox(
    plugin: PluginInstance,
    logger: ChildLogger,
    events: MiddlewareEventBus<Record<string, unknown[]>>,
    config: unknown,
  ): PluginSandbox {
    const sandbox: PluginSandbox = {
      name: plugin.meta.name,
      config: config as Readonly<unknown>,
      logger,
      events: {
        on: events.on.bind(events),
        off: events.off.bind(events),
      },
    };

    this._sandbox.set(plugin.meta.name, sandbox);

    // 设置权限
    if (plugin.meta.permissions) {
      this._permissions.set(plugin.meta.name, {
        allowed: plugin.meta.permissions,
      });
    }

    return sandbox;
  }

  /**
   * 获取插件沙箱
   */
  getSandbox(name: string): PluginSandbox | undefined {
    return this._sandbox.get(name);
  }

  /**
   * 检查插件是否有某个权限
   */
  hasPermission(pluginName: string, permission: PluginPermission): boolean {
    const perms = this._permissions.get(pluginName);

    // 没有设置权限，默认全部允许
    if (!perms) return true;

    // 检查拒绝列表
    if (perms.denied?.includes(permission)) return false;

    // 检查允许列表
    return perms.allowed.includes(permission);
  }

  /**
   * 设置插件权限
   */
  setPermissions(pluginName: string, permissions: PluginPermissions): void {
    this._permissions.set(pluginName, permissions);
  }

  /**
   * 移除插件沙箱
   */
  removeSandbox(name: string): void {
    this._sandbox.delete(name);
    this._permissions.delete(name);
  }
}

// ---------------------------------------------------------------------------
// 事件上下文工厂
// ---------------------------------------------------------------------------

/**
 * 创建带权限控制的事件上下文
 */
export function createEventContext(
  event: any,
  pluginName: string,
  sandboxManager: PluginSandboxManager,
  options: {
    reply: (text: string) => Promise<void>;
    sendAction: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
  },
): EventContext {
  let stopped = false;

  return {
    event,
    pluginName,
    stopPropagation: () => {
      stopped = true;
    },
    reply: async (text: string) => {
      if (!sandboxManager.hasPermission(pluginName, "reply")) {
        throw new Error(`插件 "${pluginName}" 没有 reply 权限`);
      }
      await options.reply(text);
    },
    sendAction: async (action: string, params?: Record<string, unknown>) => {
      if (!sandboxManager.hasPermission(pluginName, "sendAction")) {
        throw new Error(`插件 "${pluginName}" 没有 sendAction 权限`);
      }
      return options.sendAction(action, params);
    },
    hasPermission: (permission: PluginPermission) => {
      return sandboxManager.hasPermission(pluginName, permission);
    },
  };
}
