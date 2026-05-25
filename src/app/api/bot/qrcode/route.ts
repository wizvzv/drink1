import { NextResponse } from "next/server";
import { getQrCode } from "@/bot/client";

/**
 * GET /api/bot/qrcode
 * 获取微信登录二维码
 */
export async function GET() {
  try {
    const data = await getQrCode();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api] 获取二维码失败:", err);
    return NextResponse.json(
      { error: "获取二维码失败" },
      { status: 500 }
    );
  }
}
