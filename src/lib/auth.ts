/**
 * 管理员认证
 *
 * 使用环境变量 ADMIN_SECRET 作为管理员登录密钥。
 * 生产环境应通过 Railway 的变量管理设置。
 */

export function validateAdminSecret(input: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.warn("[auth] ADMIN_SECRET 未设置，使用默认密钥");
    return input === "admin";
  }
  return input === secret;
}
