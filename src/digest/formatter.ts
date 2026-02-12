import { DigestData } from "./builder";

const MAX_MESSAGE_LENGTH = 4096;
const MAX_TEXT_PREVIEW = 150;
const SEPARATOR = "\n━━━━━━━━━━━━━━━━━━\n";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mediaEmoji(type: string | null): string {
  switch (type) {
    case "photo":     return "🖼";
    case "video":     return "🎬";
    case "document":  return "📎";
    case "webpage":   return "🔗";
    case "audio":     return "🎵";
    case "voice":     return "🎤";
    case "sticker":   return "😀";
    default:          return "📦";
  }
}

function mediaLabel(type: string | null): string {
  switch (type) {
    case "photo":     return "🖼 Фото";
    case "video":     return "🎬 Видео";
    case "document":  return "📎 Документ";
    case "webpage":   return "🔗 Ссылка";
    case "audio":     return "🎵 Аудио";
    case "voice":     return "🎤 Голосовое";
    case "sticker":   return "😀 Стикер";
    default:          return "📦 Медиа";
  }
}

/**
 * Format digest data into HTML for Telegram.
 */
export function formatDigest(data: DigestData): string {
  const startDate = formatDate(data.periodStart);
  const endDate = formatDate(data.periodEnd);
  const dateRange =
    startDate === endDate ? startDate : `${startDate} — ${endDate}`;

  let html = `<b>Дайджест за ${dateRange}</b>\n`;
  html += `Сообщений: ${data.messageIds.length}\n`;

  for (const group of data.channels) {
    html += SEPARATOR;
    html += `<b>${escapeHtml(group.title)}</b>\n\n`;

    for (const msg of group.messages) {
      const time = formatTime(msg.date);
      let preview: string;
      let mediaBadge = msg.mediaType ? ` ${mediaEmoji(msg.mediaType)}` : "";

      if (msg.text) {
        preview = truncate(escapeHtml(msg.text.replace(/\n/g, " ")), MAX_TEXT_PREVIEW);
      } else if (msg.mediaType) {
        preview = mediaLabel(msg.mediaType);
        mediaBadge = ""; // уже в label
      } else {
        continue;
      }

      if (msg.url) {
        html += `  <a href="${msg.url}">${time}</a> ${preview}${mediaBadge}\n`;
      } else {
        html += `  ${time} ${preview}${mediaBadge}\n`;
      }
    }
  }

  // AI summary section
  if (data.aiSummary) {
    html += SEPARATOR;
    html += `<b>AI-итоги:</b>\n\n`;
    html += escapeHtml(data.aiSummary);
    html += "\n";
  }

  return html;
}

/**
 * Split a long HTML message into parts that fit Telegram's limit.
 * Tries to split at separator lines, falling back to newlines.
 */
export function splitMessage(html: string, maxLen: number = MAX_MESSAGE_LENGTH): string[] {
  if (html.length <= maxLen) {
    return [html];
  }

  const parts: string[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining);
      break;
    }

    // Try to split at separator
    let splitIdx = remaining.lastIndexOf(SEPARATOR, maxLen);

    // Fallback to newline
    if (splitIdx <= 0) {
      splitIdx = remaining.lastIndexOf("\n", maxLen);
    }

    // Last resort: hard cut
    if (splitIdx <= 0) {
      splitIdx = maxLen;
    }

    parts.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }

  return parts;
}
