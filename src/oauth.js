const IMAP_SCOPE =
  "https://outlook.office.com/IMAP.AccessAsUser.All offline_access";

export class OAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = "OAuthError";
    this.status = status;
  }
}

export async function exchangeRefreshToken({
  clientId,
  refreshToken,
  tenant = "consumers",
}) {
  const endpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: IMAP_SCOPE,
  });

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new OAuthError("连接 Microsoft OAuth 服务失败", 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const description = String(data.error_description ?? "");
    const message = description.includes("consent")
      ? "OAuth 未获得 IMAP 读取授权"
      : "OAuth 已失效或与 Client ID 不匹配";
    throw new OAuthError(message);
  }

  return data.access_token;
}
