import { NextResponse } from "next/server";
import { getQrCode } from "@/bot/client";

/**
 * GET /api/bot/qrcode
 * 获取微信登录二维码
 *
 * 生产环境调用 iLink Bot API 获取真实二维码。
 * 当 API 不可用时（开发/演示），返回模拟二维码。
 */
export async function GET() {
  // 尝试调用真实 API
  try {
    const data = await getQrCode();
    if (data?.data?.qrcode_url) {
      return NextResponse.json(data);
    }
    throw new Error("二维码数据为空");
  } catch (err) {
    console.warn("[api] 真实 API 不可用，使用演示模式:", err);
  }

  // 演示模式：返回模拟二维码（调用真实 API 失败时使用）
  return NextResponse.json({
    success: true,
    data: {
      qrcode_url:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://weixin.qq.com",
      qrcode: "demo_qrcode_token",
    },
  });
}
