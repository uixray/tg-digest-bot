/**
 * Format DigestData into Obsidian Markdown with proper frontmatter.
 * Based on 04-automation/templates/digest.md in the CoreDS vault.
 */

import { DigestData } from "../digest/builder";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toHHMM(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

/** Returns the filename for a digest: "YYYY-MM-DD-digest.md" */
export function digestFilename(periodStart: Date): string {
  return `${toISODate(periodStart)}-digest.md`;
}

/**
 * Format DigestData into a complete Obsidian .md document.
 */
export function formatDigestObsidian(data: DigestData): string {
  const date = toISODate(data.periodStart);
  const channelCount = data.channels.length;
  const messageCount = data.messageIds.length;
  const channelNames = data.channels.map((c) => `"${c.username || c.title}"`);

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const fm = [
    "---",
    `title: "Telegram Digest ${date}"`,
    "type: digest",
    "status: seed",
    'version: "0.1.0"',
    `created: ${date}`,
    `updated: ${date}`,
    "freshness: current",
    `freshness_checked: ${date}`,
    'tags: ["type/digest", "source/telegram"]',
    "related_components: []",
    "related_tokens: []",
    "related_patterns: []",
    "platforms: [web]",
    `description: "Telegram digest for ${date}."`,
    `channels: [${channelNames.join(", ")}]`,
    'period: "24h"',
    `messages_count: ${messageCount}`,
    "---",
  ].join("\n");

  // ── Header ────────────────────────────────────────────────────────────────
  let md = `${fm}\n\n`;
  md += `# Telegram Digest — ${date}\n\n`;
  md += `> Сгенерирован [tg-digest-bot](https://github.com/uixray/tg-digest-bot). Каналов: ${channelCount} · Сообщений: ${messageCount}.\n\n`;

  // ── AI summary ────────────────────────────────────────────────────────────
  md += "## AI-резюме\n\n";
  if (data.aiSummary) {
    md += `${data.aiSummary}\n\n`;
  } else {
    md += "<!-- Вставь AI-суммаризацию или оставь пустым -->\n\n";
  }

  // ── Per-channel message lists ──────────────────────────────────────────────
  md += "## Каналы\n\n";
  for (const group of data.channels) {
    const channelRef = group.username ? `@${group.username}` : group.title;
    md += `### 📢 ${group.title} (${channelRef})\n\n`;

    for (const msg of group.messages) {
      const time = toHHMM(msg.date);
      let text = msg.text || (msg.mediaType ? `[${msg.mediaType}]` : "");

      // Trim long messages, escape Markdown-breaking chars
      if (text.length > 300) text = text.slice(0, 297) + "...";
      text = text.replace(/\n/g, " ").replace(/\|/g, "\\|");

      if (msg.url) {
        md += `- **${time}** — ${text} [→](${msg.url})\n`;
      } else {
        md += `- **${time}** — ${text}\n`;
      }
    }

    md += "\n";
  }

  return md;
}
