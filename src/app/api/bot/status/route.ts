import { NextRequest, NextResponse } from "next/server";
import { getQrCodeStatus } from "@/bot/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bot/status?qrcode=xxx
 * 轮询二维码状态，确认后绑定用户
 *
 * 支持演示模式：qrcode=demo_qrcode_token 时，第三次轮询返回 confirmed
 */
export async function GET(request: NextRequest) {
  const qrcode = request.nextUrl.searchParams.get("qrcode");
  if (!qrcode) {
    return NextResponse.json({ error: "缺少 qrcode 参数" }, { status: 400 });
  }

  // === 演示模式 ===
  if (qrcode === "demo_qrcode_token") {
    const count = parseInt(
      request.nextUrl.searchParams.get("poll") || "0",
      10
    );
    // 第三次轮询时模拟扫码确认
    if (count >= 2) {
      // 向数据库插入演示用户
      const demoUser = await prisma.user.upsert({
        where: { id: "demo_user" },
        update: {},
        create: {
          id: "demo_user",
          nickname: "演示用户",
          role: "user",
        },
      });

      await prisma.weChatBinding.upsert({
        where: { userId: "demo_user" },
        update: { isActive: true },
        create: {
          userId: "demo_user",
          botToken: "demo_bot_token",
          ilinkBotId: "demo_bot",
          ilinkUserId: "demo_user",
          isActive: true,
        },
      });

      await prisma.reminderConfig.upsert({
        where: { userId: "demo_user" },
        update: {},
        create: { userId: "demo_user" },
      });

      return NextResponse.json({
        status: "confirmed",
        user: { id: demoUser.id, nickname: demoUser.nickname },
      });
    }

    return NextResponse.json({ status: "wait" });
  }

  // === 真实模式 ===
  try {
    const result = await getQrCodeStatus(qrcode);

    if (result.data.status === "confirmed" && result.data.credentials) {
      const creds = result.data.credentials;

      const user = await prisma.user.upsert({
        where: { id: creds.ilink_user_id },
        update: {},
        create: {
          id: creds.ilink_user_id,
          nickname: `微信用户_${creds.ilink_user_id.slice(-4)}`,
        },
      });

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

      await prisma.reminderConfig.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
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
