import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminSecret } from "@/lib/auth";

/**
 * GET /api/admin/users
 * 获取用户列表（管理员）
 *
 * Header: Authorization: Bearer <admin-secret>
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || !validateAdminSecret(secret)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
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
        _count: {
          select: {
            sendLogs: true,
            drinkRecords: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 获取今日统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await Promise.all(
      users.map(async (user: { id: string; nickname: string | null; role: string; isActive: boolean; binding: { isActive: boolean } | null; reminderConfig: { intervalRule: { intervalMinutes: number } | null; fixedTimes: { time: string }[] } | null; _count: { sendLogs: number; drinkRecords: number }; createdAt: Date }) => {
        const todaySend = await prisma.sendLog.count({
          where: {
            userId: user.id,
            sentAt: { gte: today, lt: tomorrow },
          },
        });

        const todayDrink = await prisma.drinkRecord.count({
          where: {
            userId: user.id,
            recordedAt: { gte: today, lt: tomorrow },
          },
        });

        // 计算连续天数（简化版：从今天往前数）
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const day = new Date(today);
          day.setDate(day.getDate() - i);
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);

          const count = await prisma.drinkRecord.count({
            where: {
              userId: user.id,
              recordedAt: { gte: day, lt: nextDay },
            },
          });

          if (count > 0) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }

        return {
          id: user.id,
          nickname: user.nickname,
          role: user.role,
          isActive: user.isActive,
          bindingActive: user.binding?.isActive ?? false,
          reminderMode: user.reminderConfig?.intervalRule
            ? `每${user.reminderConfig.intervalRule.intervalMinutes}分钟`
            : user.reminderConfig?.fixedTimes?.length
              ? `${user.reminderConfig.fixedTimes.length}个时间点`
              : "未配置",
          todaySend,
          todayDrink,
          streakDays: streak,
          createdAt: user.createdAt,
        };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api] 获取用户列表失败:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
