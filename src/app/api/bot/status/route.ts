import { NextRequest, NextResponse } from "next/server";
import { getQrCodeStatus } from "@/bot/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bot/status?qrcode=xxx
 * 轮询二维码状态，确认后绑定用户
 */
export async function GET(request: NextRequest) {
  const qrcode = request.nextUrl.searchParams.get("qrcode");
  if (!qrcode) {
    return NextResponse.json({ error: "缺少 qrcode 参数" }, { status: 400 });
  }

  try {
    const result = await getQrCodeStatus(qrcode);

    // 如果用户已确认扫码，保存绑定信息
    if (
      result.data.status === "confirmed" &&
      result.data.credentials
    ) {
      const creds = result.data.credentials;

      // 查找或创建用户
      const user = await prisma.user.upsert({
        where: {
          id: creds.ilink_user_id,
        },
        update: {},
        create: {
          id: creds.ilink_user_id,
          nickname: `微信用户_${creds.ilink_user_id.slice(-4)}`,
        },
      });

      // 保存或更新微信绑定
      await prisma.weChatBinding.upsert({
        where: { userId: user.id },
        update: {
          botToken: creds.bot_token,
          ilinkBotId: creds.ilink_bot_id,
          ilinkUserId: creds.ilink_user_id,
          isActive: true,
        },
        create: {
          userId: user.id,
          botToken: creds.bot_token,
          ilinkBotId: creds.ilink_bot_id,
          ilinkUserId: creds.ilink_user_id,
        },
      });

      // 确保有提醒配置
      await prisma.reminderConfig.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      });

      return NextResponse.json({
        status: "confirmed",
        user: { id: user.id, nickname: user.nickname },
      });
    }

    return NextResponse.json({ status: result.data.status });
  } catch (err) {
    console.error("[api] 查询二维码状态失败:", err);
    return NextResponse.json(
      { error: "查询二维码状态失败" },
      { status: 500 }
    );
  }
}
