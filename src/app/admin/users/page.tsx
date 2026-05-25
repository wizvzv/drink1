"use client";

import { useEffect, useState } from "react";

interface UserListItem {
  id: string;
  nickname: string | null;
  role: string;
  isActive: boolean;
  bindingActive: boolean;
  reminderMode: string;
  todaySend: number;
  todayDrink: number;
  streakDays: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeBindings: number;
  todaySend: number;
  todayDrink: number;
  replyRate: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const secret = sessionStorage.getItem("admin_secret");
    if (!secret) {
      window.location.href = "/admin/login";
      return;
    }

    const headers = { Authorization: `Bearer ${secret}` };

    const [usersRes, statsRes] = await Promise.all([
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/stats", { headers }),
    ]);

    if (usersRes.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    setUsers(await usersRes.json());
    setStats(await statsRes.json());
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 喝水提醒</h1>
            <p className="text-sm text-gray-400">
              管理后台 · 共 {stats?.totalUsers || 0} 位用户
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="mb-6 grid grid-cols-5 gap-3">
            <AdminStatCard value={String(stats.totalUsers)} label="总用户" />
            <AdminStatCard
              value={String(stats.activeBindings)}
              label="已绑定"
            />
            <AdminStatCard value={String(stats.todaySend)} label="今日发送" />
            <AdminStatCard value={String(stats.todayDrink)} label="今日喝水" />
            <AdminStatCard value={`${stats.replyRate}%`} label="回复率" />
          </div>
        )}

        {/* 用户列表 */}
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">昵称</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">提醒模式</th>
                <th className="px-4 py-3 font-medium">今日发送</th>
                <th className="px-4 py-3 font-medium">今日喝水</th>
                <th className="px-4 py-3 font-medium">连续天数</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 text-gray-700 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">{user.nickname || "—"}</td>
                  <td className="px-4 py-3">
                    {user.bindingActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        正常
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        已断开
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.reminderMode}
                  </td>
                  <td className="px-4 py-3">{user.todaySend}</td>
                  <td className="px-4 py-3">{user.todayDrink}</td>
                  <td className="px-4 py-3">{user.streakDays}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/users/${user.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      详情
                    </a>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
