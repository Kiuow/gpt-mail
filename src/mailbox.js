import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { extractOtp } from "./otp.js";

const OUTLOOK_IMAP_HOST = "outlook.office365.com";
const MICROSOFT_CONSUMER_DOMAINS = new Set([
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
]);

export class MailboxError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "MailboxError";
    this.status = status;
  }
}

export function normalizeMicrosoftImapUser(email) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;

  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!MICROSOFT_CONSUMER_DOMAINS.has(domain)) return email;

  const plus = localPart.indexOf("+");
  if (plus <= 0) return email;
  return `${localPart.slice(0, plus)}@${domain}`;
}

async function connectImap(email, accessToken) {
  const imapUser = normalizeMicrosoftImapUser(email);
  const client = new ImapFlow({
    host: OUTLOOK_IMAP_HOST,
    port: 993,
    secure: true,
    auth: {
      user: imapUser,
      accessToken,
    },
    logger: false,
    greetingTimeout: 15_000,
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
    tls: {
      rejectUnauthorized: true,
      servername: OUTLOOK_IMAP_HOST,
    },
  });

  try {
    await client.connect();
    return client;
  } catch {
    try {
      await client.logout();
    } catch {
      // Connection may not have reached the authenticated state.
    }
    throw new MailboxError("Outlook IMAP 登录失败，请检查 OAuth 授权");
  }
}

function selectFolders(boxes, folderMode) {
  const inbox =
    boxes.find(
      (box) =>
        String(box.specialUse ?? "").toLowerCase() === "\\inbox" ||
        box.path.toLowerCase() === "inbox",
    )?.path ?? "INBOX";
  const junk = boxes.find(
    (box) =>
      String(box.specialUse ?? "").toLowerCase() === "\\junk" ||
      /(^|[/.])(?:junk|junk email|spam|垃圾邮件)$/i.test(box.path),
  )?.path;

  if (folderMode === "inbox") return [{ path: inbox, label: "收件箱" }];
  if (folderMode === "junk") {
    return junk ? [{ path: junk, label: "垃圾邮件" }] : [];
  }

  const selected = [{ path: inbox, label: "收件箱" }];
  if (junk && junk.toLowerCase() !== inbox.toLowerCase()) {
    selected.push({ path: junk, label: "垃圾邮件" });
  }
  return selected;
}

function normalizeAddress(value) {
  return value?.text || value?.value?.[0]?.address || "未知发件人";
}

async function readFolder(client, folder, maxCount, keyword) {
  let lock;
  try {
    lock = await client.getMailboxLock(folder.path, { readOnly: true });
  } catch {
    throw new MailboxError(`无法打开文件夹：${folder.path}`);
  }

  const candidateLimit = Math.min(Math.max(maxCount * 5, 30), 100);
  const rawMessages = [];

  try {
    const total = client.mailbox?.exists ?? 0;
    if (total === 0) return [];
    const start = Math.max(1, total - candidateLimit + 1);
    for await (const message of client.fetch(`${start}:*`, {
      uid: true,
      source: true,
      internalDate: true,
    })) {
      if (message.source) {
        rawMessages.push({
          uid: message.uid,
          raw: message.source,
          internalDate: message.internalDate,
        });
      }
    }
  } catch {
    throw new MailboxError("下载邮件失败");
  } finally {
    lock.release();
  }

  const parsed = [];
  for (const { uid, raw, internalDate } of rawMessages.reverse()) {
    const mail = await simpleParser(raw, {
      skipHtmlToText: false,
      skipTextToHtml: true,
    });
    const subject = mail.subject || "(无主题)";
    const body = (mail.text || "").trim();
    parsed.push({
      uid,
      folder: folder.label,
      from: normalizeAddress(mail.from),
      subject,
      body: body.slice(0, 30_000),
      date: (mail.date || internalDate)?.toISOString() || "",
      otp: extractOtp(subject, body),
    });
  }

  const needle = keyword.trim().toLocaleLowerCase();
  return parsed
    .filter((mail) => {
      if (!needle) return true;
      return `${mail.from}\n${mail.subject}\n${mail.body}`
        .toLocaleLowerCase()
        .includes(needle);
    })
    .slice(0, maxCount);
}

export async function readMailbox({
  email,
  accessToken,
  folderMode,
  maxCount,
  keyword,
}) {
  const client = await connectImap(email, accessToken);
  try {
    const boxes = await client.list();
    const folders = selectFolders(boxes, folderMode);
    const groups = [];
    for (const folder of folders) {
      groups.push(await readFolder(client, folder, maxCount, keyword));
    }

    return groups
      .flat()
      .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0))
      .slice(0, maxCount);
  } finally {
    try {
      await client.logout();
    } catch {
      // Connection may already be closed.
    }
  }
}
