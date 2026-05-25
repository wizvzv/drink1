/**
 * 定时提醒调度器
 *
 * 每分钟执行一次，查询所有活跃的提醒配置，
 * 根据间隔规则和固定时间规则计算出当前是否需要发送，
 * 通过 iLink Bot API 发送提醒消息。
 */

import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/bot/client";

/**
 * 启动定时调度
 */
export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    try {
      await tick();
    } catch (err) {
      console.error("[scheduler] tick 错误:", err);
    }
  });

  console.log("[scheduler] 调度器已启动（每分钟执行）");
}

async function tick(): Promise<void> {
  const now = new Date();
  const currentHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // 查询所有活跃的提醒配置（含关联数据）
  const configs = await prisma.reminderConfig.findMany({
    where: { isActive: true },
    include: {
      intervalRule: true,
      fixedTimes: true,
      user: {
        include: {
          binding: true,
        },
      },
    },
  });

  for (const config of configs) {
    if (!config.user.binding?.isActive) continue;

    let shouldSend = false;

    // 检查固定时间规则
    for (const ft of config.fixedTimes) {
      if (ft.time === currentHHmm) {
        shouldSend = true;
        break;
      }
    }

    // 检查间隔规则
    if (!shouldSend && config.intervalRule) {
      const rule = config.intervalRule;
      if (currentHHmm >= rule.startTime && currentHHmm <= rule.endTime) {
        // 确定这个分钟是否在间隔周期内
        const [startH, startM] = rule.startTime.split(":").map(Number);
        const startTotalMin = startH * 60 + startM;
        const [nowH, nowM] = currentHHmm.split(":").map(Number);
        const nowTotalMin = nowH * 60 + nowM;
        const diff = nowTotalMin - startTotalMin;

        if (diff % rule.intervalMinutes === 0) {
          shouldSend = true;
        }
      }
    }

    if (!shouldSend) continue;

    // 发送提醒
    try {
      const binding = config.user.binding;
      const result = await sendMessage(
        binding.botToken,
        binding.ilinkUserId,
        "💧 该喝水了！回复任意内容打卡",
        binding.contextToken || undefined
      );

      await prisma.sendLog.create({
        data: {
          userId: config.userId,
          status: result.ret === 0 ? "success" : "failed",
          messageContent: "💧 该喝水了！回复任意内容打卡",
        },
      });

      if (result.ret === 0) {
        console.log(
          `[scheduler] 已发送: user=${config.userId} time=${currentHHmm}`
        );
      } else {
        console.warn(
          `[scheduler] 发送失败: user=${config.userId} ret=${result.ret}`
        );
      }
    } catch (err) {
      console.error(`[scheduler] 发送异常: user=${config.userId}`, err);

      await prisma.sendLog.create({
        data: {
          userId: config.userId,
          status: "failed",
          messageContent: "💧 该喝水了！回复任意内容打卡",
        },
      });
    }
  }
}
