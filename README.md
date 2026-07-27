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
- 不保存密码、Client ID、Refresh Token 或邮件内容
- 提供请求大小、账号数量、邮件数量和请求频率限制
- 响应使用 `no-store`，避免浏览器缓存敏感结果

## 安全提醒

本项目只能用于你本人拥有或已获得明确授权的邮箱。

部署到 Vercel 后，接口将可以通过互联网访问。建议启用 Vercel Deployment
Protection、限制项目访问人员，或在正式公开使用前增加独立的身份验证。项目内置的
内存限流只提供基础保护，在 Serverless 多实例环境中不能代替平台级防火墙和限流。

邮件凭据只在当前请求的内存中使用，代码不会将它们写入文件、数据库或日志。不过，
任何能够修改部署代码、环境变量或查看运行时的人都应被视为受信任的项目管理员。

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
| `PORT` | 仅本地 | `8787` | 本地服务端口；Vercel 会自动分配端口 |

不要把真实 Token 写入 `.env.example`、Git 仓库或 Vercel 构建日志。

## 本地运行

需要 Node.js 24。

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

启动开发服务：

```bash
npm run dev
```

打开 `http://127.0.0.1:8787`。

如果 Windows PowerShell 阻止执行 `npm.ps1`，可以把命令中的 `npm` 换成
`npm.cmd`。

## 部署到 Vercel

Vercel 可以自动识别本项目的 Express 入口。仓库内的 `vercel.json` 已配置：

- Express Framework Preset
- Fluid Compute
- 香港 `hkg1` 运行区域
- 300 秒函数执行上限
- 将 `public` 目录包含进函数部署包

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

### 通过 Vercel CLI 部署

创建预览部署：

```bash
npx vercel
```

确认预览环境工作后发布到生产：

```bash
npx vercel --prod
```

## 测试

运行完整检查：

```bash
npm run check
```

也可以只运行单元测试：

```bash
npm test
```

测试不会连接真实邮箱，只验证凭据格式、邮箱登录名处理和验证码提取逻辑。

## 项目结构

```text
public/           前端页面、样式、交互脚本和图标
src/              Express 服务、OAuth、IMAP 与验证码提取逻辑
test/             不连接真实邮箱的单元测试
.env.example      本地环境变量示例
.vercelignore     Vercel 部署排除规则
vercel.json       Vercel 函数和区域配置
```
