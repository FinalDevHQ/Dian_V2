import { writeFile } from "node:fs/promises";
import yaml from "js-yaml";

// ---------------------------------------------------------------------------
// YAML 工具函数
// ---------------------------------------------------------------------------

/**
 * 解析 YAML 字符串
 */
export function parseYaml<T = unknown>(text: string): T {
  return yaml.load(text) as T;
}

/**
 * 序列化为 YAML 字符串
 */
export function dumpYaml(value: unknown): string {
  return yaml.dump(value, {
    noRefs: true,
    lineWidth: 120,
    sortKeys: false,
  });
}

/**
 * 将对象写入 YAML 文件
 */
export async function writeYamlFile(filePath: string, value: unknown): Promise<void> {
  const content = dumpYaml(value);
  await writeFile(filePath, content, "utf-8");
}
