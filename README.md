# GPT Mail

GPT Mail 是一个 Outlook / Hotmail 邮件验证码读取工具。它使用 Microsoft OAuth2
换取短期访问令牌，通过 IMAP 读取最近邮件，并从主题和正文中提取验证码。

项目使用原生 HTML、CSS、JavaScript 与 Express 编写，可在本地运行，也已适配
Vercel Functions。

## 功能

- 使用 OAuth2 读取 Outlook、Hotmail、Live 和 MSN 邮箱
- 同时检查收件箱与垃圾邮件
- 支持关键词筛选和批量邮箱输入
- 自动识别中文及英文验证码
- 邮件图片、链接和验证码采用安全的格式化展示
- 提供请求大小、账号数量、邮件数量和请求频率限制

## 输入格式

每行填写一个邮箱：

```text
邮箱----密码----Client ID----Refresh Token
```

也支持以下格式：

```text
邮箱----密码----Client ID|Refresh Token
邮箱----密码----Refresh Token
```

第三种格式需要设置 `MICROSOFT_CLIENT_ID` 环境变量。密码字段仅用于兼容常见凭据
格式和非空校验，不会用于传统 IMAP 密码登录。

## Microsoft OAuth 要求

Refresh Token 必须由对应的 Microsoft 应用签发，并包含以下授权：

```text
https://outlook.office.com/IMAP.AccessAsUser.All
offline_access
```

Client ID、Refresh Token 与邮箱账户必须互相匹配。

个人 Outlook / Hotmail 默认使用 `consumers` 租户。如需支持 Microsoft 365 组织
账户，可将 `MICROSOFT_TENANT` 设置为 `common`。

对于 Outlook、Hotmail、Live 和 MSN 的加号地址，例如
`name+tag@outlook.com`，程序会自动使用 `name@outlook.com` 作为 IMAP 登录名，
页面仍会显示原始地址。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `MICROSOFT_CLIENT_ID` | 否 | 空 | 三段式凭据使用的默认 Microsoft Client ID |
| `MICROSOFT_TENANT` | 否 | `consumers` | 可设置为 `consumers` 或 `common` |
| `MAX_ACCOUNTS_PER_REQUEST` | 否 | `10` | 单次请求最多处理的邮箱数，允许范围为 1–20 |
| `PORT` | 仅本地 | `8787` | 本地服务端口 |

## 本地运行

需要 Node.js 24。

启动开发服务：

```bash
npm run dev
```

## 部署到 Vercel



### 通过 Git 部署

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 打开 [Vercel New Project](https://vercel.com/new) 并导入仓库。
3. 保持 Framework Preset 为 Express。
4. 在项目设置的 Environment Variables 中填写需要的变量。
5. 点击 Deploy。
6. 部署完成后访问 `/api/health`，应返回：

```json
{"ok":true}
```

