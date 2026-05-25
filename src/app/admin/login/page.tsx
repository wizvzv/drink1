"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });

    if (!res.ok) {
      setError("密钥错误");
      return;
    }

    // 将密钥存入 sessionStorage 供后续使用
    sessionStorage.setItem("admin_secret", secret);
    router.push("/admin/users");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          📊 管理后台
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          请输入管理员密钥
        </p>

        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="管理员密钥"
          className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none"
          autoFocus
        />

        {error && (
          <p className="mb-3 text-center text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          登录
        </button>
      </form>
    </main>
  );
}
