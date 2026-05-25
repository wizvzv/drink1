# 喝水提醒微信 Bot — 设计文档

> 基于微信 Clawbot (iLink Bot API) 的定时喝水提醒服务，支持多用户自助 + 管理后台。
> 
> 日期：2026-05-25

---

## 1. 概述

用户通过微信扫码绑定 ClawBot 后，系统定时发送喝水提醒消息。用户回复任意内容即视为打卡一次。页面显示今日喝水进度、连续天数、下次提醒时间。管理员可通过后台查看所有用户数据。

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 运行时 | Node.js 24+ |
| 语言 | TypeScript |
| 框架 | Next.js App Router |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 前端样式 | Tailwind CSS |
| 定时调度 | node-cron |
| 部署平台 | Railway（或等效支持长连接的 PaaS） |

## 3. 数据模型

### User（用户）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| nickname | String? | 微信昵称/显示名 |
| role | Enum(UserRole) | `user` 或 `admin` |
| is_active | Boolean | 是否启用，默认 true |
| created_at | DateTime | |
| updated_at | DateTime | |

### WeChatBinding（微信绑定）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | UUID → User | 关联用户 |
| bot_token | String | 加密存储的 Bearer token |
| ilink_bot_id | String | Bot 标识 |
| ilink_user_id | String | 微信用户标识 |
| context_token | String? | 最近消息上下文（用于回复路由） |
| is_active | Boolean | 是否有效 |
| expires_at | DateTime? | 过期时间 |
| created_at | DateTime | |
| updated_at | DateTime | |

### ReminderConfig（提醒配置）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | UUID → User | 关联用户 |
| is_active | Boolean | 总开关 |
| timezone | String | 时区，默认 `Asia/Shanghai` |
| created_at | DateTime | |
| updated_at | DateTime | |

### IntervalRule（间隔规则）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| reminder_config_id | UUID → ReminderConfig | 关联配置（唯一，0 或 1 条） |
| interval_minutes | Int | 每多少分钟 |
| start_time | String | HH:mm 格式，如 `09:00` |
| end_time | String | HH:mm 格式，如 `20:00` |

### FixedTimeRule（固定时间规则）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| reminder_config_id | UUID → ReminderConfig | 关联配置 |
| time | String | HH:mm 格式，如 `09:00` |

一个 ReminderConfig 可以有 0 到 N 条 FixedTimeRule。

### SendLog（发送日志）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | UUID → User | 关联用户 |
| sent_at | DateTime | 发送时间 |
| message_content | String | 消息内容（如"💧 该喝水了！"） |
| status | Enum(SendStatus) | `success` 或 `failed` |

### DrinkRecord（喝水记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| user_id | UUID → User | 关联用户 |
| recorded_at | DateTime | 用户回复时间（即喝水时间） |
| reply_message | String | 用户的回复内容 |


**ER 关系：**

```
User 1──1 WeChatBinding
User 1──1 ReminderConfig
ReminderConfig 1──0..1 IntervalRule
ReminderConfig 1──0..N FixedTimeRule
User 1──N SendLog
User 1──N DrinkRecord
```

## 4. 页面结构

### 用户端（Next.js App Router）

首页 `/` 根据登录状态切换视图，整个应用只有一个用户端入口：

**未登录视图：**
- 每小时定时提醒概览（顶部）
- 连续坚持统计卡片（今日/连续天数/下次提醒）
- 可点击的扫码登录区域 → 点击后展示微信二维码
- 扫码绑定后自动跳转到已登录视图

**已登录视图（今日面板）：**
- 今日喝水进度环形图（如 3/8 次）
- 下次提醒时间 + 倒计时
- 喝了一杯、下次提醒统计卡片
- 今日打卡记录时间轴
- 底部设置区：管理提醒配置

### 用户面板内容

- **今日喝水进度**：环形进度条（当前次数 / 预期次数）
- **下次提醒**：时间 + 倒计时
- **今日统计**：今日已喝、连续天数、下次提醒
- **今日打卡记录**：时间轴列表
- **提醒设置**：开关、间隔模式配置、固定时间点管理

### 管理端

| 路径 | 功能 |
|---|---|
| `/admin/login` | 管理员登录（输入密钥） |
| `/admin/users` | 用户列表（状态、模式、统计数据、操作） |
| `/admin/users/[id]` | 用户详情（配置、发送记录、喝水日历） |
| `/admin/stats` | 总览统计数据 |

### 管理员登录

通过环境变量 `ADMIN_SECRET` 配置密钥，登录输入匹配后进入后台。

## 5. 扫码绑定流程

```
用户访问 /bind
    ↓
服务端调用 GET /get_bot_qrcode?bot_type=3 (iLink API)
    ↓
返回二维码 URL → 前端渲染二维码
    ↓
前端通过 SSE 或轮询调用 GET /get_qrcode_status?qrcode=xxx
    ↓
状态: wait → scaned → confirmed
    ↓
confirmed → 获取 credentials (bot_token, ilink_bot_id, ilink_user_id)
    ↓
服务端保存 WeChatBinding → 绑定成功 → 跳转面板
```

**说明：**
- 二维码每进入页面重新生成
- 过期后自动刷新
- token 过期后用户可重新扫码绑定

## 6. 提醒调度逻辑

### 调度引擎

- node-cron 每分钟执行一次 tick
- 查询所有 `is_active = true` 的 ReminderConfig
- 对每个用户，同时检查 IntervalRule 和 FixedTimeRule

### 碰撞处理

同一用户在同一分钟内若有多个规则命中（如固定时间 09:00 与间隔模式 09:00 重叠），**只发一条消息**。

### 发送流程

1. 查出需发送的用户列表
2. 对每个用户，用其 WeChatBinding 的凭据调用 `POST /sendmessage`
3. 记录 SendLog（成功/失败）
4. 失败时（如凭据过期）标记 binding 为失效，管理员后台可见

### 消息接收

- 后台独立循环：`POST /getupdates` 长轮询（挂起 35 秒）
- 收到用户消息后匹配对应 User
- 记录 DrinkRecord（recorded_at = 消息时间）
- 原样回传 `context_token`

## 7. API 接口

### iLink Bot API（外部）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /get_bot_qrcode?bot_type=3 | 获取登录二维码 |
| GET | /get_qrcode_status?qrcode=xxx | 轮询扫码状态 |
| POST | /getupdates | 长轮询接收消息 |
| POST | /sendmessage | 发送文本/媒体消息 |

### 内部 API Routes

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | /api/bot/qrcode | 获取二维码（代理 iLink API） |
| GET | /api/bot/status?qrcode=xxx | 轮询扫码状态 |
| POST | /api/user/config | 更新用户提醒配置 |
| GET | /api/admin/users | 获取用户列表 |
| GET | /api/admin/users/[id] | 获取用户详情 |
| GET | /api/admin/stats | 统计数据 |
| POST | /api/admin/login | 管理员登录 |

## 8. 项目目录结构

```
drink-reminder/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── bind/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── login/
│   │       │   └── page.tsx
│   │       ├── users/
│   │       │   ├── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       └── stats/
│   │           └── page.tsx
│   ├── api/
│   │   ├── bot/
│   │   │   ├── qrcode/route.ts
│   │   │   ├── status/route.ts
│   │   │   └── reply/route.ts
│   │   ├── user/
│   │   │   └── config/route.ts
│   │   └── admin/
│   │       ├── login/route.ts
│   │       ├── users/route.ts
│   │       └── stats/route.ts
│   ├── bot/
│   │   ├── client.ts          # iLink Bot API 客户端封装
│   │   └── poller.ts          # 消息接收长轮询循环
│   ├── scheduler/
│   │   └── index.ts           # node-cron 调度器
│   └── lib/
│       ├── prisma.ts
│       └── auth.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## 9. 部署方案

### 平台选择：Railway

| 考量 | 说明 |
|---|---|
| 长轮询 | 需要 35 秒长连接，Railway 常驻进程完美支持（Vercel 不可用） |
| PostgreSQL | 一键添加，开箱即用 |
| 部署 | 连 GitHub 仓库，自动部署 |
| 费用 | 有免费额度，小项目约 $0~$5/月 |

### 环境变量

```
DATABASE_URL=postgresql://...
ADMIN_SECRET=your-admin-secret
ILINK_BOT_TYPE=3
```

## 10. 非功能性要求

- 用户凭据（bot_token）在数据库中加密存储
- 每分钟调度 tick 查询需走索引，控制查询时间
- 管理员登录走独立密钥，不依赖微信体系
- 所有时间处理基于用户的 timezone 设置

## 11. 未来可能的扩展（当前不做）

- 喝水量的记录（用户回复具体 ml 数）
- 统计图表（周/月喝水趋势）
- 排行榜 / 好友喝水 PK
- 多语言支持
