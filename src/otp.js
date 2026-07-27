const CONTEXT_PATTERNS = [
  /(?:验证码|校验码|动态码|安全码|登录码|verification\s*code|security\s*code|one[-\s]*time\s*(?:password|code)|\botp\b|\bcode\b)[^\p{L}\p{N}]{0,16}([A-Z0-9]{4,10})/iu,
  /([A-Z0-9]{4,10})[^\p{L}\p{N}]{0,16}(?:是你的验证码|is\s+your\s+(?:verification\s+)?code)/iu,
];

const STANDALONE_DIGITS = /(?:^|[^\d])(\d{4,8})(?!\d)/g;

export function extractOtp(subject = "", body = "") {
  const text = `${subject}\n${body}`.replace(/\s+/g, " ").trim();

  for (const pattern of CONTEXT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  const candidates = [];
  for (const match of text.matchAll(STANDALONE_DIGITS)) {
    const value = match[1];
    const numeric = Number(value);
    const looksLikeYear = value.length === 4 && numeric >= 1900 && numeric <= 2100;
    if (!looksLikeYear) {
      candidates.push(value);
    }
  }

  return candidates[0] ?? "";
}

