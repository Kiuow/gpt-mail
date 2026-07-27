const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CredentialFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "CredentialFormatError";
  }
}

export function parseCredentialLine(rawLine, fallbackClientId = "") {
  const line = String(rawLine ?? "").trim();
  if (!line) {
    throw new CredentialFormatError("存在空白凭据");
  }

  const parts = line.split("----");
  if (parts.length < 3) {
    throw new CredentialFormatError(
      "格式应为 邮箱----密码----Client ID----Refresh Token",
    );
  }

  const email = parts.shift()?.trim() ?? "";
  const password = parts.shift() ?? "";
  let clientId = "";
  let refreshToken = "";

  if (parts.length === 1 && parts[0].includes("|")) {
    const separatorAt = parts[0].indexOf("|");
    clientId = parts[0].slice(0, separatorAt).trim();
    refreshToken = parts[0].slice(separatorAt + 1).trim();
  } else if (parts.length === 1) {
    clientId = fallbackClientId.trim();
    refreshToken = parts[0].trim();
  } else {
    clientId = parts.shift()?.trim() ?? "";
    refreshToken = parts.join("----").trim();
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new CredentialFormatError("邮箱地址格式不正确");
  }
  if (!password) {
    throw new CredentialFormatError("密码字段不能为空");
  }
  if (!clientId) {
    throw new CredentialFormatError("缺少 Microsoft Client ID");
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    throw new CredentialFormatError("Microsoft Client ID 格式不正确");
  }
  if (refreshToken.length < 20) {
    throw new CredentialFormatError("Refresh Token 缺失或过短");
  }

  return { email, password, clientId, refreshToken };
}

export function parseCredentialText(rawText, fallbackClientId, maximum) {
  const lines = String(rawText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new CredentialFormatError("请至少输入一条邮箱凭据");
  }
  if (lines.length > maximum) {
    throw new CredentialFormatError(`一次最多处理 ${maximum} 个邮箱`);
  }

  return lines.map((line, index) => {
    try {
      return parseCredentialLine(line, fallbackClientId);
    } catch (error) {
      if (error instanceof CredentialFormatError) {
        throw new CredentialFormatError(`第 ${index + 1} 行：${error.message}`);
      }
      throw error;
    }
  });
}

