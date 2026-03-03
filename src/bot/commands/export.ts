/**
 * /export command — export the latest digest to the Obsidian vault.
 *
 * Usage:
 *   /export          — last 24h, no AI
 *   /export 3d       — last 3 days
 *   /export 1w ai    — last 7 days with AI summary
 */

import { Context } from "telegraf";
import { collectAll } from "../../userbot/collector";
import { buildDigest } from "../../digest/builder";
import { exportDigestToVault } from "../../obsidian/exporter";
import { config } from "../../config";

function parsePeriod(arg: string): Date | null {
  const match = arg.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case "h": return new Date(now.getTime() - amount * 60 * 60 * 1000);
    case "d": return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
    case "w": return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
    default:  return null;
  }
}

export async function exportCommand(ctx: Context) {
  // Guard: check GitHub config before doing any work
  if (!config.githubToken || !config.githubRepo) {
    await ctx.reply(
      "⚠️ <b>Obsidian экспорт не настроен.</b>\n\n" +
        "Добавьте в <code>.env</code>:\n" +
        "<code>GITHUB_TOKEN=ghp_...\nGITHUB_REPO=owner/repo</code>",
      { parse_mode: "HTML" }
    );
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  let since: Date | undefined;
  let withAI = false;

  for (const arg of args) {
    if (arg === "ai") {
      withAI = true;
    } else {
      const parsed = parsePeriod(arg);
      if (parsed) since = parsed;
    }
  }

  try {
    await ctx.reply("📥 Собираю сообщения...");
    await collectAll(since);

    await ctx.reply(
      withAI
        ? "🤖 Формирую дайджест с AI-суммаризацией..."
        : "📝 Формирую дайджест..."
    );
    const digest = await buildDigest(since, withAI);

    if (!digest) {
      await ctx.reply("Нет новых сообщений за указанный период.");
      return;
    }

    await ctx.reply("☁️ Экспортирую в Obsidian vault...");
    const result = await exportDigestToVault(digest);

    await ctx.reply(
      `✅ <b>Экспорт завершён!</b>\n\n` +
        `📄 Файл: <code>${result.path}</code>\n` +
        `🔗 <a href="${result.url}">Открыть на GitHub</a>`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  } catch (err: any) {
    console.error("[Export] Error:", err.message);
    await ctx.reply(`❌ Ошибка экспорта: ${err.message}`);
  }
}
