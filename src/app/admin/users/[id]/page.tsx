"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface UserDetail {
  id: string;
  nickname: string | null;
  isActive: boolean;
  bindingActive: boolean;
  reminderMode: string;
  todaySend: number;
  todayDrink: number;
  streakDays: number;
  sendLogs: Array<{
    id: string;
    sentAt: string;
    status: string;
  }>;
  drinkRecords: Array<{
    id: string;
    recordedAt: string;
    replyMessage: string;
  }>;
}

export default function AdminUserDetail() {
  const params = useParams();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) {
      window.location.href = "/admin/login";
      return;
    }

    const res = await fetch(`/api/admin/users/${params.id}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    setUser(await res.json());
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">加载中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">用户不存在</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="/admin/users"
          className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← 返回用户列表
        </a>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {user.nickname || "未命名用户"}
          </h1>
          <p className="font-mono text-xs text-gray-400">{user.id}</p>
        </div>

        {/* 用户概览 */}
        <div className="mb-6 grid grid-cols-4 gap-3">
          <AdminStatCard
            value={user.bindingActive ? "已连接" : "已断开"}
            label="微信绑定"
          />
          <AdminStatCard value={String(user.todaySend)} label="今日发送" />
          <AdminStatCard value={String(user.todayDrink)} label="今日喝水" />
          <AdminStatCard value={String(user.streakDays)} label="连续天数" />
        </div>

        {/* 提醒配置 */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            ⚙️ 提醒配置
          </h2>
          <p className="text-sm text-gray-600">
            模式：{user.reminderMode || "未配置"}
          </p>
        </div>

        {/* 发送记录 */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            📤 发送记录
          </h2>
          {user.sendLogs.length === 0 ? (
            <p className="text-sm text-gray-400">暂无记录</p>
          ) : (
            <div className="space-y-2">
              {user.sendLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-500">
                    {new Date(log.sentAt).toLocaleString("zh-CN")}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      log.status === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status === "success" ? "成功" : "失败"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 喝水记录 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            💧 喝水记录
          </h2>
          {user.drinkRecords.length === 0 ? (
            <p className="text-sm text-gray-400">暂无记录</p>
          ) : (
            <div className="space-y-2">
              {user.drinkRecords.slice(0, 20).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-500">
                    {new Date(record.recordedAt).toLocaleString("zh-CN")}
                  </span>
                  <span className="text-gray-600">
                    {record.replyMessage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AdminStatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="mt-0.5 text-xs text-gray-400">{label}</div>
    </div>
  );
}
