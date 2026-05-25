/**
 * Next.js instrumentation
 *
 * 在服务启动时初始化定时调度器和消息轮询
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 动态引入以避免构建时执行
    const { startScheduler } = await import("./scheduler");
    const { startAllPollers } = await import("./bot/poller");

    // 启动调度器
    startScheduler();

    // 启动消息接收轮询
    // 注：iLink Bot API 需要有效的 bot_token，如果数据库中没有活跃绑定则静默跳过
    startAllPollers().catch((err) => {
      console.error("[instrumentation] 启动轮询失败:", err);
    });
  }
}
