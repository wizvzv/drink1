# 💧 喝水提醒微信 Bot

基于微信 Clawbot (iLink Bot API) 的定时喝水提醒服务，支持多用户自助 + 管理后台。

## 功能

- **定时提醒** — 每小时通过微信发送喝水提醒
- **回复打卡** — 用户回复任意内容即记录一次喝水
- **多用户** — 每个用户独立配置和统计
- **管理后台** — 查看所有用户的发送/喝水数据和统计

## 技术栈

- **框架**: Next.js 16 (App Router)
- **数据库**: PostgreSQL + Prisma ORM
- **Bot 协议**: 微信 iLink Bot API (Clawbot)
- **部署**: Railway

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填写配置：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接地址 |
| `ADMIN_SECRET` | 管理员后台登录密钥 |

### 3. 初始化数据库

```bash
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 管理后台

访问 `/admin/login`，输入 `ADMIN_SECRET` 设置的密钥。

## 部署到 Railway

1. Fork 或推送此仓库到 GitHub
2. 在 [Railway](https://railway.app) 中创建新项目 → Deploy from GitHub
3. 添加 PostgreSQL 插件
4. 设置环境变量 `ADMIN_SECRET`
5. 部署自动完成

> Railway 的常驻进程支持 iLink Bot API 的长轮询（35 秒连接），适合本项目的消息接收模式。

## 项目结构

```
├── prisma/schema.prisma    # 数据模型
├── src/
│   ├── app/                # 页面 + API 路由
│   │   ├── page.tsx        # 首页（未登录/已登录双视图）
│   │   └── admin/          # 管理后台页面
│   ├── bot/
│   │   ├── client.ts       # iLink Bot API 封装
│   │   └── poller.ts       # 消息接收轮询
│   ├── scheduler/
│   │   └── index.ts        # 定时调度器
│   └── lib/
│       ├── prisma.ts       # Prisma 客户端
│       └── auth.ts         # 管理员认证
```
