import { createServer } from "./server.js";

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = createServer();

  // 优雅退出
  const shutdown = async () => {
    console.log("\n收到退出信号，正在关闭...");
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await server.start();
    console.log("Dian V2 服务器已启动");
    console.log("按 Ctrl+C 停止");
  } catch (err) {
    console.error("启动失败:", err);
    process.exit(1);
  }
}

main();
