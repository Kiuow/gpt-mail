const form = document.querySelector("#mail-form");
const credentialsInput = document.querySelector("#credentials");
const secretWrap = document.querySelector("#secret-wrap");
const toggleSecretButton = document.querySelector("#toggle-secret");
const fetchButton = document.querySelector("#fetch-button");
const clearButton = document.querySelector("#clear-button");
const alertBox = document.querySelector("#alert");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const resultsContainer = document.querySelector("#results");

function setLoading(isLoading) {
  fetchButton.disabled = isLoading;
  fetchButton.querySelector("span").textContent = isLoading
    ? "正在获取…"
    : "获取邮件";
  loadingState.hidden = !isLoading;
  if (isLoading) {
    emptyState.hidden = true;
    resultsContainer.hidden = true;
    alertBox.hidden = true;
  }
}

function showError(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
  emptyState.hidden = true;
  loadingState.hidden = true;
}

function formatDate(rawDate) {
  if (!rawDate) return "未知时间";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function safeWebUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function isDisplayImage(url) {
  return (
    url.startsWith("https://") &&
    /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(url)
  );
}

function createMailLink(url, label = "") {
  const link = createElement("a", "mail-link", label || "打开链接");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer nofollow";
  link.referrerPolicy = "no-referrer";
  link.title = url;
  if (!label) {
    link.append(document.createTextNode(" ↗"));
  }
  return link;
}

function renderBodyContent(rawBody) {
  const body = createElement("div", "mail-body");
  const lines = String(rawBody || "(无纯文本正文)").split(/\r?\n/);
  const bracketedUrl = /^(.*?)\s*\[(https?:\/\/[^\]]+)\]\s*[。.]?$/i;
  const plainUrl = /^(https?:\/\/\S+)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      body.append(createElement("div", "mail-spacer"));
      continue;
    }

    const bracketMatch = line.match(bracketedUrl);
    const plainMatch = line.match(plainUrl);
    const rawUrl = bracketMatch?.[2] || plainMatch?.[1] || "";
    const url = rawUrl ? safeWebUrl(rawUrl) : null;
    const label = bracketMatch?.[1]?.trim() || "";

    if (url && isDisplayImage(url)) {
      const figure = createElement("figure", "mail-image");
      const image = document.createElement("img");
      image.src = url;
      image.alt = label || "邮件图片";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      figure.append(image);
      if (label) {
        figure.append(createElement("figcaption", "", label));
      }
      body.append(figure);
      continue;
    }

    if (url) {
      if (!label && /\/wf\/open(?:\?|$)/i.test(url)) {
        continue;
      }

      const previous = body.lastElementChild;
      if (
        !label &&
        previous?.classList.contains("mail-line") &&
        !previous.classList.contains("mail-otp-line") &&
        previous.textContent.trim().length <= 100
      ) {
        const linkedLabel = previous.textContent.trim();
        const paragraph = createElement("p", "mail-line mail-link-line");
        paragraph.append(createMailLink(url, linkedLabel));
        previous.replaceWith(paragraph);
        continue;
      }

      const paragraph = createElement("p", "mail-line mail-link-line");
      paragraph.append(createMailLink(url, label));
      body.append(paragraph);
      continue;
    }

    const paragraphClass = /^\d{4,8}$/.test(line)
      ? "mail-line mail-otp-line"
      : "mail-line";
    body.append(createElement("p", paragraphClass, line));
  }

  return body;
}

async function copyOtp(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = "已复制";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  } catch {
    showError("浏览器拒绝访问剪贴板，请手动复制验证码");
  }
}

function renderMessage(message) {
  const card = createElement("article", "mail-card");
  const summary = createElement("button", "mail-summary");
  summary.type = "button";
  summary.setAttribute("aria-expanded", "false");

  const meta = createElement("div", "mail-meta");
  meta.append(
    createElement("span", "folder-tag", message.folder),
    createElement("span", "mail-from", message.from),
    createElement("time", "mail-date", formatDate(message.date)),
  );

  const subjectRow = createElement("div", "mail-subject-row");
  subjectRow.append(createElement("span", "mail-subject", message.subject));
  if (message.otp) {
    subjectRow.append(createElement("span", "otp", message.otp));
  }
  summary.append(meta, subjectRow);

  const details = createElement("div", "mail-details");
  details.hidden = true;
  details.append(renderBodyContent(message.body));
  if (message.otp) {
    const copyButton = createElement(
      "button",
      "copy-button",
      `复制验证码 ${message.otp}`,
    );
    copyButton.type = "button";
    copyButton.addEventListener("click", () =>
      copyOtp(message.otp, copyButton),
    );
    details.append(copyButton);
  }

  summary.addEventListener("click", () => {
    details.hidden = !details.hidden;
    summary.setAttribute("aria-expanded", String(!details.hidden));
  });

  card.append(summary, details);
  return card;
}

function renderResults(results) {
  resultsContainer.replaceChildren();
  for (const account of results) {
    const block = createElement("section", "account-block");
    const title = createElement("div", "account-title");
    title.append(
      createElement("span", "", account.email),
      createElement(
        "span",
        "account-count",
        account.ok ? `${account.count} 封` : "读取失败",
      ),
    );
    block.append(title);

    if (!account.ok) {
      block.append(createElement("div", "account-error", account.error));
    } else if (account.messages.length === 0) {
      block.append(createElement("div", "no-mail", "没有找到匹配邮件"));
    } else {
      const list = createElement("div", "mail-list");
      account.messages.forEach((message) => list.append(renderMessage(message)));
      block.append(list);
    }
    resultsContainer.append(block);
  }

  resultsContainer.hidden = false;
  emptyState.hidden = true;
}

toggleSecretButton.addEventListener("click", () => {
  const isMasked = secretWrap.classList.toggle("is-masked");
  toggleSecretButton.textContent = isMasked ? "显示内容" : "隐藏内容";
});

clearButton.addEventListener("click", () => {
  credentialsInput.value = "";
  document.querySelector("#keyword").value = "";
  resultsContainer.replaceChildren();
  resultsContainer.hidden = true;
  alertBox.hidden = true;
  loadingState.hidden = true;
  emptyState.hidden = false;
  credentialsInput.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);

  try {
    const response = await fetch("/api/mailbox/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credentials: credentialsInput.value,
        folder: document.querySelector("#folder").value,
        keyword: document.querySelector("#keyword").value,
        maxCount: Number(document.querySelector("#max-count").value),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "服务器没有返回有效结果");
    }
    renderResults(data.results || []);
  } catch (error) {
    showError(error.message || "请求失败，请检查本地服务");
  } finally {
    setLoading(false);
  }
});
