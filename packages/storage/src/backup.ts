import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type Database } from "sql.js";

// ---------------------------------------------------------------------------
// BackupManager
// ---------------------------------------------------------------------------

export class BackupManager {
  private _db: Database;
  private _dbPath: string;
  private _saveFn: () => void;

  constructor(db: Database, dbPath: string, saveFn: () => void) {
    this._db = db;
    this._dbPath = dbPath;
    this._saveFn = saveFn;
  }

  /**
   * 备份数据库到指定路径
   */
  backup(backupPath: string): void {
    const resolvedPath = resolve(backupPath);

    // 确保目录存在
    const dir = dirname(resolvedPath);
    mkdirSync(dir, { recursive: true });

    // 保存当前数据库
    this._saveFn();

    // 复制文件
    copyFileSync(this._dbPath, resolvedPath);
  }

  /**
   * 从备份恢复数据库
   */
  restore(backupPath: string): void {
    const resolvedPath = resolve(backupPath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`备份文件不存在: ${resolvedPath}`);
    }

    // 关闭当前数据库
    this._db.close();

    // 复制备份文件到原位置
    copyFileSync(resolvedPath, this._dbPath);

    // 重新加载数据库
    const buffer = readFileSync(this._dbPath);
    // 注意：这里需要重新创建 Database 实例，但 sql.js 不支持直接替换
    // 实际使用时需要在 StorageService 层面处理
    throw new Error("恢复功能需要在 StorageService 层面重新初始化");
  }

  /**
   * 导出数据库为 Buffer
   */
  exportBuffer(): Buffer {
    this._saveFn();
    const data = this._db.export();
    return Buffer.from(data);
  }

  /**
   * 从 Buffer 导入数据库
   */
  importBuffer(buffer: Buffer): void {
    // 关闭当前数据库
    this._db.close();

    // 写入文件
    writeFileSync(this._dbPath, buffer);

    // 注意：这里需要重新创建 Database 实例
    throw new Error("导入功能需要在 StorageService 层面重新初始化");
  }
}
