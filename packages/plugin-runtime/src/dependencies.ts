import type { PluginInstance, PluginMeta, DependencyCheckResult } from "./types.js";

// ---------------------------------------------------------------------------
// 依赖检查器
// ---------------------------------------------------------------------------

/**
 * 检查插件依赖
 */
export function checkDependencies(
  plugin: PluginInstance,
  loadedPlugins: Map<string, PluginInstance>,
): DependencyCheckResult {
  const missing: string[] = [];
  const versionMismatch: { name: string; required: string; actual: string }[] = [];

  const { dependencies, minDeps } = plugin.meta;

  if (!dependencies) {
    return { ok: true, missing: [], versionMismatch: [] };
  }

  for (const dep of dependencies) {
    const depPlugin = loadedPlugins.get(dep);

    if (!depPlugin) {
      missing.push(dep);
      continue;
    }

    // 检查版本
    if (minDeps?.[dep] && depPlugin.meta.version) {
      const required = minDeps[dep];
      const actual = depPlugin.meta.version;

      if (!satisfiesVersion(actual, required)) {
        versionMismatch.push({ name: dep, required, actual });
      }
    }
  }

  return {
    ok: missing.length === 0 && versionMismatch.length === 0,
    missing,
    versionMismatch,
  };
}

/**
 * 检查所有插件依赖
 */
export function checkAllDependencies(
  plugins: Map<string, PluginInstance>,
): { plugin: string; result: DependencyCheckResult }[] {
  const results: { plugin: string; result: DependencyCheckResult }[] = [];

  for (const [name, plugin] of plugins) {
    const result = checkDependencies(plugin, plugins);
    if (!result.ok) {
      results.push({ plugin: name, result });
    }
  }

  return results;
}

/**
 * 获取启动顺序（拓扑排序）
 */
export function getStartupOrder(plugins: Map<string, PluginInstance>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (name: string) => {
    if (visited.has(name)) return;
    visited.add(name);

    const plugin = plugins.get(name);
    if (plugin?.meta.dependencies) {
      for (const dep of plugin.meta.dependencies) {
        visit(dep);
      }
    }

    result.push(name);
  };

  for (const name of plugins.keys()) {
    visit(name);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 版本比较工具
// ---------------------------------------------------------------------------

/**
 * 检查版本是否满足要求
 * 简单的 semver 比较，支持 ^ 和 ~
 */
function satisfiesVersion(actual: string, required: string): boolean {
  const actualParts = actual.split(".").map(Number);
  const requiredParts = required.split(".").map(Number);

  // 精确匹配
  if (required === actual) return true;

  // ^ 版本（兼容主版本）
  if (required.startsWith("^")) {
    const [, ...reqParts] = required.split(".").map(Number);
    if (actualParts[0] !== reqParts[0]) return false;
    return compareVersions(actual, required.slice(1)) >= 0;
  }

  // ~ 版本（兼容次版本）
  if (required.startsWith("~")) {
    const [, , ...reqParts] = required.split(".").map(Number);
    if (actualParts[0] !== requiredParts[0] || actualParts[1] !== requiredParts[1]) {
      return false;
    }
    return compareVersions(actual, required.slice(1)) >= 0;
  }

  // 默认：大于等于
  return compareVersions(actual, required) >= 0;
}

/**
 * 比较版本号
 * 返回: 1 (大于), 0 (等于), -1 (小于)
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}
