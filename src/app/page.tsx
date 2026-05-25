"use client";

import { useCallback, useEffect, useState } from "react";

interface UserState {
  isLoggedIn: boolean;
  todayCount: number;
  streakDays: number;
  nextReminder: string;
}

interface QrCodeData {
  qrcode_url: string;
  qrcode: string;
}

export default function Home() {
  const [user, setUser] = useState<UserState | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<QrCodeData | null>(null);
  const [qrStatus, setQrStatus] = useState<string>("");
  const [qrError, setQrError] = useState("");

  // 获取二维码
  const fetchQrCode = useCallback(async () => {
    setQrError("");
    setQrStatus("wait");
    try {
      const res = await fetch("/api/bot/qrcode");
      if (!res.ok) throw new Error("获取二维码失败");
      const data = await res.json();
      if (data.data?.qrcode_url) {
        setQrData({
          qrcode_url: data.data.qrcode_url,
          qrcode: data.data.qrcode,
        });
        // 开始轮询扫码状态
        pollStatus(data.data.qrcode);
      } else {
        throw new Error("二维码数据异常");
      }
    } catch {
      setQrError("获取二维码失败，请重试");
    }
  }, []);

  // 轮询扫码状态
  const pollStatus = useCallback(async (qrcode: string, pollCount = 0) => {
    try {
      const res = await fetch(
        `/api/bot/status?qrcode=${qrcode}&poll=${pollCount}`
      );
      const data = await res.json();

      if (data.status === "confirmed") {
        setQrStatus("confirmed");
        setUser({
          isLoggedIn: true,
          todayCount: 0,
          streakDays: 0,
          nextReminder: "--:--",
        });
        return;
      }

      if (data.status === "expired") {
        setQrStatus("expired");
        setQrError("二维码已过期，请重新获取");
        return;
      }

      setQrStatus(data.status);

      // 继续轮询
      setTimeout(() => pollStatus(qrcode, pollCount + 1), 2000);
    } catch {
      // 重试
      setTimeout(() => pollStatus(qrcode, pollCount + 1), 3000);
    }
  }, []);

  // 点击扫码按钮
  const handleLoginClick = useCallback(() => {
    setShowQr(true);
    fetchQrCode();
  }, [fetchQrCode]);

  useEffect(() => {
    // TODO: 检查登录状态（通过 cookie/session）
    setUser(null);
  }, []);

  if (!user || !user.isLoggedIn) {
    return (
      <NotLoggedInView
        onLoginClick={handleLoginClick}
        showQr={showQr}
        qrData={qrData}
        qrStatus={qrStatus}
        qrError={qrError}
        onRetry={fetchQrCode}
      />
    );
  }

  return <LoggedInView user={user} />;
}

function NotLoggedInView({
  onLoginClick,
  showQr,
  qrData,
  qrStatus,
  qrError,
  onRetry,
}: {
  onLoginClick: () => void;
  showQr: boolean;
  qrData: QrCodeData | null;
  qrStatus: string;
  qrError: string;
  onRetry: () => void;
}) {
  const statusText =
    qrStatus === "wait"
      ? "等待扫码..."
      : qrStatus === "scaned"
        ? "已扫码，请在手机上确认"
        : qrStatus === "expired"
          ? "二维码已过期"
          : "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl">💧</h1>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">喝水提醒</h2>
          <p className="mt-1 text-sm text-gray-400">ClawBot · 微信定时提醒</p>
        </div>

        {/* 每小时提醒概览 */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="text-5xl font-extrabold">每小时</div>
          <div className="mt-1 text-sm opacity-80">定时提醒</div>
          <div className="mt-3 text-xs opacity-60">⏰ 到点微信提醒 · 回复即打卡</div>
        </div>

        {/* 连续坚持统计 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard value="0" label="今日已喝" />
          <StatCard value="0" label="连续天数" />
          <StatCard value="--" label="下次提醒" />
        </div>

        {/* 扫码登录 */}
        {!showQr ? (
          <button
            onClick={onLoginClick}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <div className="text-6xl">📱</div>
            <div className="mt-3 text-lg font-medium text-gray-700">扫码连接微信</div>
            <div className="mt-1 text-sm text-gray-400">使用微信扫描 · 接收定时提醒</div>
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-indigo-200 bg-white p-8 text-center shadow-md">
            <div className="mb-2 text-6xl">📱</div>
            <div className="mb-2 text-lg font-medium text-gray-700">使用微信扫码</div>

            {qrData ? (
              <div className="mb-4 mx-auto h-48 w-48 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData.qrcode_url}
                  alt="微信二维码"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="mb-4 mx-auto h-48 w-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                {qrError ? "加载失败" : "二维码加载中..."}
              </div>
            )}

            {statusText && !qrError && (
              <p className="text-sm text-indigo-600 mb-2">{statusText}</p>
            )}

            {qrError && (
              <div className="mb-2">
                <p className="text-sm text-red-500">{qrError}</p>
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  重试
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400">请使用微信扫描二维码以绑定</p>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          ⏳ 未登录 · 扫码后开始记录
        </p>
      </div>
    </main>
  );
}

function LoggedInView({ user }: { user: UserState }) {
  const total = 8;
  const progress = user.todayCount;
  const angle = (progress / total) * 360;

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-4xl">💧</h1>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">喝水提醒</h2>
          <span className="mt-1 inline-block rounded-full bg-green-100 px-3 py-0.5 text-xs text-green-700">
            已连接 ✓
          </span>
        </div>

        {/* 今日喝水进度 */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100"
            style={{
              background: `conic-gradient(#667eea ${angle}deg, #eef2f6 ${angle}deg 360deg)`,
            }}
          >
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-gray-800">{progress}</span>
              <span className="text-xs text-gray-400">/ {total} 次</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">今日喝水进度</p>
        </div>

        {/* 下次提醒 */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
          <div>
            <div className="text-lg font-semibold text-gray-800">⏰ {user.nextReminder}</div>
            <div className="text-xs text-gray-400">下次喝水提醒</div>
          </div>
          <span className="text-3xl">💧</span>
        </div>

        {/* 统计 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard value={String(user.todayCount)} label="今日已喝" />
          <StatCard value={String(user.streakDays)} label="连续天数" />
          <StatCard value={user.nextReminder} label="下次提醒" />
        </div>

        {/* 打卡提示 */}
        <div className="mb-6 rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">💬 回复微信消息即可打卡</p>
        </div>
      </div>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm">
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="mt-0.5 text-xs text-gray-400">{label}</div>
    </div>
  );
}
