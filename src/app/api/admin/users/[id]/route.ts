import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminSecret } from "@/lib/auth";

/**
 * GET /api/admin/users/[id]
 * 获取用户详情（管理员）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || !validateAdminSecret(secret)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        binding: {
          select: { isActive: true },
        },
        reminderConfig: {
          include: {
            intervalRule: true,
            fixedTimes: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 今日统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySend, todayDrink, sendLogs, drinkRecords] =
      await Promise.all([
        prisma.sendLog.count({
          where: { userId: id, sentAt: { gte: today, lt: tomorrow } },
        }),
        prisma.drinkRecord.count({
          where: { userId: id, recordedAt: { gte: today, lt: tomorrow } },
        }),
        prisma.sendLog.findMany({
          where: { userId: id },
          orderBy: { sentAt: "desc" },
          take: 50,
          select: { id: true, sentAt: true, status: true },
        }),
        prisma.drinkRecord.findMany({
          where: { userId: id },
          orderBy: { recordedAt: "desc" },
          take: 50,
          select: { id: true, recordedAt: true, replyMessage: true },
        }),
      ]);

    // 计算连续天数
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await prisma.drinkRecord.count({
        where: {
          userId: id,
          recordedAt: { gte: day, lt: nextDay },
        },
      });

      if (count > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const reminderMode = user.reminderConfig?.intervalRule
      ? `每${user.reminderConfig.intervalRule.intervalMinutes}分钟`
      : user.reminderConfig?.fixedTimes?.length
        ? `${user.reminderConfig.fixedTimes.length}个时间点`
        : "未配置";

    return NextResponse.json({
      id: user.id,
      nickname: user.nickname,
      isActive: user.isActive,
      bindingActive: user.binding?.isActive ?? false,
      reminderMode,
      todaySend,
      todayDrink,
      streakDays: streak,
      sendLogs,
      drinkRecords,
    });
  } catch (err) {
    console.error("[api] 获取用户详情失败:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
