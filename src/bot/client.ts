/**
 * iLink Bot API 客户端
 *
 * 封装微信 Clawbot 的 HTTP 协议接口。
 * 基座地址: https://ilinkai.weixin.qq.com
 *
 * 协议参考: https://www.wechatbot.dev/zh/protocol
 */

const BASE_URL = "https://ilinkai.weixin.qq.com";

interface QrCodeResponse {
  success: boolean;
  data: {
    qrcode_url: string;
    qrcode: string;
  };
}

interface QrCodeStatusResponse {
  success: boolean;
  data: {
    status: "wait" | "scaned" | "confirmed" | "expired";
    credentials: {
      bot_token: string;
      ilink_bot_id: string;
      ilink_user_id: string;
    } | null;
    baseurl: string;
  };
}

interface GetUpdatesResponse {
  ret: number;
  data?: Array<{
    msg_id: string;
    content: string;
    from_user: string;
    context_token: string;
  }>;
  get_updates_buf?: string;
}

interface SendMessageResponse {
  ret: number;
}

/**
 * 生成 X-WECHAT-UIN 请求头
 * 每次请求重新生成：随机 4 字节 → uint32 → 十进制字符串 → base64
 */
function generateWechatUin(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const view = new DataView(buf.buffer);
  const uint32 = view.getUint32(0, true); // little-endian
  const decimalStr = String(uint32);
  return Buffer.from(decimalStr).toString("base64");
}

/**
 * 构建通用请求头
 */
function buildHeaders(botToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-WECHAT-UIN": generateWechatUin(),
  };

  if (botToken) {
    headers["AuthorizationType"] = "ilink_bot_token";
    headers["Authorization"] = `Bearer ${botToken}`;
  }

  return headers;
}

/**
 * 获取微信登录二维码
 */
export async function getQrCode(): Promise<QrCodeResponse> {
  const url = `${BASE_URL}/get_bot_qrcode?bot_type=3`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`获取二维码失败: ${res.status}`);
  }

  return res.json();
}

/**
 * 轮询微信二维码扫描状态
 */
export async function getQrCodeStatus(
  qrcode: string
): Promise<QrCodeStatusResponse> {
  const url = `${BASE_URL}/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(`查询二维码状态失败: ${res.status}`);
  }

  return res.json();
}

/**
 * 发送文本消息
 */
export async function sendMessage(
  botToken: string,
  toUser: string,
  text: string,
  contextToken?: string
): Promise<SendMessageResponse> {
  const body: Record<string, unknown> = {
    base_info: { channel_version: "2.0.0" },
    to_user: toUser,
    content: text,
    msg_type: 1, // 文本消息
  };

  if (contextToken) {
    body.context_token = contextToken;
  }

  const res = await fetch(`${BASE_URL}/sendmessage`, {
    method: "POST",
    headers: buildHeaders(botToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`发送消息失败: ${res.status}`);
  }

  return res.json();
}

/**
 * 长轮询接收消息
 * 服务器挂起连接约 35 秒
 */
export async function getUpdates(
  botToken: string,
  getUpdatesBuf: string = ""
): Promise<GetUpdatesResponse> {
  const body = {
    base_info: { channel_version: "2.0.0" },
    get_updates_buf: getUpdatesBuf,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);

  try {
    const res = await fetch(`${BASE_URL}/getupdates`, {
      method: "POST",
      headers: buildHeaders(botToken),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`接收消息失败: ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 重置微信 IM 通道
 */
export async function resetChannel(
  botToken: string,
  channelId: string
): Promise<void> {
  const body = {
    base_info: { channel_version: "2.0.0" },
    channel_id: channelId,
  };

  const res = await fetch(`${BASE_URL}/api/v1/wechat/channel_reset`, {
    method: "POST",
    headers: buildHeaders(botToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`重置通道失败: ${res.status}`);
  }
}
