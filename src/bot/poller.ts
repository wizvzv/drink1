/**
 * 消息接收轮询器
 *
 * 通过 iLink Bot API 的长轮询接口持续接收用户回复，
 * 匹配用户后记录 DrinkRecord。
 */

import { prisma } from "@/lib/prisma";
import { getUpdates } from "./client";

interface PollerOptions {
  onMessage?: (userId: string, text: string) => Promise<void>;
}

/**
 * 启动单个用户的消息轮询
 * 每个已绑定的活跃用户需要一个轮询循环
 */
export async function startPollingForUser(
  bindingId: string,
  botToken: string,
  getUpdatesBuf: string = "",
  options: PollerOptions = {}
): Promise<void> {
  try {
    const result = await getUpdates(botToken, getUpdatesBuf);

    // ret: -14 表示会话过期
    if (result.ret === -14) {
      console.warn(`[poller] 会话过期 binding=${bindingId}`);
      // 标记绑定为失效
      await prisma.weChatBinding.update({
        where: { id: bindingId },
        data: { isActive: false },
      });
      return;
    }

    // 处理收到的消息
    if (result.data && result.data.length > 0) {
      for (const msg of result.data) {
        const binding = await prisma.weChatBinding.findUnique({
          where: { id: bindingId },
          select: { userId: true },
        });

        if (!binding) continue;

        // 记录喝水打卡
        await prisma.drinkRecord.create({
          data: {
            userId: binding.userId,
            replyMessage: msg.content,
          },
        });

        // 更新 context_token
        await prisma.weChatBinding.update({
          where: { id: bindingId },
          data: { contextToken: msg.context_token },
        });

        console.log(
          `[poller] 收到回复: user=${binding.userId} content="${msg.content}"`
        );
      }
    }

    // 继续下一轮轮询
    const nextBuf = result.get_updates_buf || "";
    setImmediate(() =>
      startPollingForUser(bindingId, botToken, nextBuf, options)
    );
  } catch (err) {
    console.error(`[poller] 错误 binding=${bindingId}:`, err);
    // 等待后重试
    setTimeout(
      () => startPollingForUser(bindingId, botToken, getUpdatesBuf, options),
      5000
    );
  }
}

/**
 * 启动所有活跃用户的轮询
 */
export async function startAllPollers(): Promise<void> {
  const bindings = await prisma.weChatBinding.findMany({
    where: { isActive: true },
    select: { id: true, botToken: true },
  });

  console.log(`[poller] 启动 ${bindings.length} 个用户轮询`);

  for (const binding of bindings) {
    startPollingForUser(binding.id, binding.botToken);
  }
}
