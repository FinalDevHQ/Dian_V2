import "reflect-metadata";
import type { PluginMeta, HandlerMeta, InterceptorMeta, Pattern } from "./types.js";
import { PLUGIN_META_KEY, HANDLER_META_KEY, INTERCEPTOR_META_KEY } from "./types.js";

// ---------------------------------------------------------------------------
// 装饰器
// ---------------------------------------------------------------------------

/**
 * 插件装饰器
 *
 * @example
 * @Plugin({ name: "my-plugin", description: "我的插件" })
 * class MyPlugin {
 *   @Handler(/hello/i)
 *   async onHello(ctx: EventContext) {
 *     await ctx.reply("Hello!");
 *   }
 * }
 */
export function Plugin(meta: PluginMeta): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(PLUGIN_META_KEY, meta, target);
  };
}

/**
 * 处理器装饰器
 *
 * @example
 * @Handler(/hello/i)
 * async onHello(ctx: EventContext) {
 *   await ctx.reply("Hello!");
 * }
 */
export function Handler(pattern: Pattern): MethodDecorator {
  return (target, propertyKey) => {
    const existing: HandlerMeta[] =
      Reflect.getMetadata(HANDLER_META_KEY, target.constructor) ?? [];

    existing.push({
      method: propertyKey as string,
      pattern,
    });

    Reflect.defineMetadata(HANDLER_META_KEY, existing, target.constructor);
  };
}

/**
 * 拦截器装饰器
 *
 * @example
 * @Interceptor(50)
 * async checkAuth(ctx: EventContext) {
 *   if (unauthorized) ctx.stopPropagation();
 * }
 */
export function Interceptor(priority: number = 100): MethodDecorator {
  return (target, propertyKey) => {
    const existing: InterceptorMeta[] =
      Reflect.getMetadata(INTERCEPTOR_META_KEY, target.constructor) ?? [];

    existing.push({
      method: propertyKey as string,
      priority,
    });

    Reflect.defineMetadata(INTERCEPTOR_META_KEY, existing, target.constructor);
  };
}

// ---------------------------------------------------------------------------
// 元数据读取工具
// ---------------------------------------------------------------------------

/**
 * 获取插件元数据
 */
export function getPluginMeta(target: Object): PluginMeta | undefined {
  return Reflect.getMetadata(PLUGIN_META_KEY, target);
}

/**
 * 获取处理器元数据
 */
export function getHandlerMeta(target: Object): HandlerMeta[] {
  return Reflect.getMetadata(HANDLER_META_KEY, target) ?? [];
}

/**
 * 获取拦截器元数据
 */
export function getInterceptorMeta(target: Object): InterceptorMeta[] {
  return Reflect.getMetadata(INTERCEPTOR_META_KEY, target) ?? [];
}
