import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminSecret } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * 获取统计数据（管理员）
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || !validateAdminSecret(secret)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalUsers, activeBindings, todaySend, todayDrink] =
      await Promise.all([
        prisma.user.count(),
        prisma.weChatBinding.count({ where: { isActive: true } }),
        prisma.sendLog.count({
          where: { sentAt: { gte: today, lt: tomorrow } },
        }),
        prisma.drinkRecord.count({
          where: { recordedAt: { gte: today, lt: tomorrow } },
        }),
      ]);

    return NextResponse.json({
      totalUsers,
      activeBindings,
      todaySend,
      todayDrink,
      replyRate: todaySend > 0 ? Math.round((todayDrink / todaySend) * 100) : 0,
    });
  } catch (err) {
    console.error("[api] 获取统计失败:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
