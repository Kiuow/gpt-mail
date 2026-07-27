import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  CredentialFormatError,
  parseCredentialText,
} from "./credentials.js";
import { exchangeRefreshToken, OAuthError } from "./oauth.js";
import { MailboxError, readMailbox } from "./mailbox.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "8787", 10);
const maximumAccounts = Math.min(
  Math.max(Number.parseInt(process.env.MAX_ACCOUNTS_PER_REQUEST || "10", 10), 1),
  20,
);
const tenant = process.env.MICROSOFT_TENANT || "consumers";
const fallbackClientId = process.env.MICROSOFT_CLIENT_ID || "";
const currentFile = fileURLToPath(import.meta.url);
const publicDirectory = path.resolve(path.dirname(currentFile), "../public");
const isVercel = Boolean(process.env.VERCEL);

app.disable("x-powered-by");
if (isVercel) {
  app.set("trust proxy", 1);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.json({ limit: "128kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "请求过于频繁，请稍后再试" },
  }),
);

app.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/mailbox/fetch", async (request, response) => {
  const {
    credentials = "",
    folder = "all",
    keyword = "",
    maxCount = 10,
  } = request.body ?? {};

  if (!["all", "inbox", "junk"].includes(folder)) {
    return response.status(400).json({ error: "邮箱文件夹参数不正确" });
  }

  const safeMaxCount = Math.min(Math.max(Number(maxCount) || 10, 1), 20);
  if (String(keyword).length > 100) {
    return response.status(400).json({ error: "关键词过长" });
  }

  try {
    const accounts = parseCredentialText(
      credentials,
      fallbackClientId,
      maximumAccounts,
    );

    const results = [];
    for (const account of accounts) {
      try {
        const accessToken = await exchangeRefreshToken({
          clientId: account.clientId,
          refreshToken: account.refreshToken,
          tenant,
        });
        const messages = await readMailbox({
          email: account.email,
          accessToken,
          folderMode: folder,
          maxCount: safeMaxCount,
          keyword: String(keyword),
        });
        results.push({
          email: account.email,
          ok: true,
          count: messages.length,
          messages,
        });
      } catch (error) {
        const safeMessage =
          error instanceof OAuthError || error instanceof MailboxError
            ? error.message
            : "读取邮箱时发生未知错误";
        results.push({
          email: account.email,
          ok: false,
          error: safeMessage,
          messages: [],
        });
      }
    }

    return response.json({ results });
  } catch (error) {
    const status =
      error instanceof CredentialFormatError
        ? 400
        : error instanceof OAuthError || error instanceof MailboxError
          ? error.status
          : 500;
    const message =
      error instanceof CredentialFormatError ||
      error instanceof OAuthError ||
      error instanceof MailboxError
        ? error.message
        : "服务器处理失败";
    return response.status(status).json({ error: message });
  }
});

app.use(express.static(publicDirectory, { etag: false, maxAge: 0 }));
app.get("/{*path}", (_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

const server = isVercel
  ? null
  : app.listen(port, "127.0.0.1", () => {
      console.log(`GPT Mail 已启动：http://127.0.0.1:${port}`);
    });

export default app;
export { app, server };
