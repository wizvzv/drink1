import { NextRequest, NextResponse } from "next/server";
import { validateAdminSecret } from "@/lib/auth";

/**
 * POST /api/admin/login
 * 管理员登录
 *
 * Body: { secret: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || !validateAdminSecret(secret)) {
      return NextResponse.json({ error: "密钥错误" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
