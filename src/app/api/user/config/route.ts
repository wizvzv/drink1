import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/user/config
 * 更新用户的提醒配置
 *
 * Body:
 * {
 *   userId: string;
 *   isActive?: boolean;
 *   timezone?: string;
 *   intervalRule?: { intervalMinutes: number; startTime: string; endTime: string } | null;
 *   fixedTimes?: string[]; // ["09:00", "12:00", ...]
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, isActive, timezone, intervalRule, fixedTimes } = body;

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
    }

    // 更新基本配置
    if (isActive !== undefined || timezone !== undefined) {
      await prisma.reminderConfig.update({
        where: { userId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(timezone !== undefined && { timezone }),
        },
      });
    }

    // 更新间隔规则
    if (intervalRule !== undefined) {
      // 删除旧的间隔规则
      await prisma.intervalRule.deleteMany({
        where: { reminderConfig: { userId } },
      });

      if (intervalRule) {
        const config = await prisma.reminderConfig.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (config) {
          await prisma.intervalRule.create({
            data: {
              reminderConfigId: config.id,
              intervalMinutes: intervalRule.intervalMinutes,
              startTime: intervalRule.startTime,
              endTime: intervalRule.endTime,
            },
          });
        }
      }
    }

    // 更新固定时间规则
    if (fixedTimes !== undefined) {
      const config = await prisma.reminderConfig.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (config) {
        await prisma.fixedTimeRule.deleteMany({
          where: { reminderConfigId: config.id },
        });

        for (const time of fixedTimes) {
          await prisma.fixedTimeRule.create({
            data: {
              reminderConfigId: config.id,
              time,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] 更新配置失败:", err);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}
