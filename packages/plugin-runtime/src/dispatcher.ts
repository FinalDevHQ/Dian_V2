import type { BotEvent } from "@myfinal/dian-shared";
import type {
  PluginInstance,
  EventContext,
  HandlerMeta,
  InterceptorMeta,
  Pattern,
} from "./types.js";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface DispatchResult {
  /** 是否被拦截 */
  stopped: boolean;
  /** 执行的处理器数量 */
  handlerCount: number;
}

// ---------------------------------------------------------------------------
// Pattern 匹配
// ---------------------------------------------------------------------------

function matchPattern(pattern: Pattern, text: string): boolean {
  if (typeof pattern === "function") {
    pattern = pattern();
  }

  if (pattern instanceof RegExp) {
    return pattern.test(text);
  }

  return text === pattern;
}

// ---------------------------------------------------------------------------
// 事件分发
// ---------------------------------------------------------------------------

/**
 * 分发事件到所有插件
 */
export async function dispatchEvent(
  event: BotEvent,
  plugins: PluginInstance[],
  options: {
    reply: (text: string) => Promise<void>;
    sendAction: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
  },
): Promise<DispatchResult> {
  let stopped = false;
  let handlerCount = 0;

  // 构建事件上下文
  const ctx: EventContext = {
    event,
    pluginName: "",
    stopPropagation: () => {
      stopped = true;
    },
    reply: options.reply,
    sendAction: options.sendAction,
    hasPermission: () => true,
  };

  // 1. 执行拦截器
  const allInterceptors = collectInterceptors(plugins);
  for (const { interceptor, plugin } of allInterceptors) {
    if (stopped) break;

    try {
      const method = (plugin.instance as Record<string, Function>)[interceptor.method];
      if (method) {
        await method.call(plugin.instance, ctx);
      }
    } catch (err) {
      console.error(`[plugin-runtime] 拦截器执行出错 (${plugin.meta.name}):`, err);
    }
  }

  if (stopped) return { stopped: true, handlerCount: 0 };

  // 2. 提取消息文本
  const messageText = extractMessageText(event);

  // 3. 执行处理器
  for (const plugin of plugins) {
    if (stopped) break;
    if (!plugin.enabled) continue;

    // 执行 @Handler 方法
    for (const handler of plugin.handlers) {
      if (stopped) break;

      if (matchPattern(handler.pattern, messageText)) {
        try {
          const method = (plugin.instance as Record<string, Function>)[handler.method];
          if (method) {
            await method.call(plugin.instance, ctx);
            handlerCount++;
          }
        } catch (err) {
          console.error(`[plugin-runtime] 处理器执行出错 (${plugin.meta.name}.${handler.method}):`, err);
        }
      }
    }
  }

  return { stopped, handlerCount };
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function collectInterceptors(plugins: PluginInstance[]): {
  interceptor: InterceptorMeta;
  plugin: PluginInstance;
}[] {
  const result: {
    interceptor: InterceptorMeta;
    plugin: PluginInstance;
  }[] = [];

  for (const plugin of plugins) {
    if (!plugin.enabled) continue;

    for (const interceptor of plugin.interceptors) {
      result.push({ interceptor, plugin });
    }
  }

  // 按优先级排序
  result.sort((a, b) => a.interceptor.priority - b.interceptor.priority);

  return result;
}

function extractMessageText(event: BotEvent): string {
  if (event.payload.text) {
    return event.payload.text;
  }

  const msg = (event.payload as Record<string, unknown>).message;
  if (typeof msg === "string") {
    return msg;
  }

  if (Array.isArray(msg)) {
    return msg
      .filter((seg: any) => seg.type === "text")
      .map((seg: any) => seg.data?.text ?? "")
      .join("");
  }

  return "";
}
