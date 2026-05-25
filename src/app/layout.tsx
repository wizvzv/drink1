import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "💧 喝水提醒",
  description: "微信定时喝水提醒 · 回复即打卡",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
