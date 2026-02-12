import { Context, Markup } from "telegraf";
import { prisma } from "../../db/prisma";
import { mainMenuKeyboard } from "./menu";

/**
 * /start — Context-aware onboarding.
 * Shows different messages based on user state.
 */
export async function startCommand(ctx: Context) {
  const channelCount = await prisma.channel.count({ where: { isActive: true } });

  if (channelCount === 0) {
    // First-time user: onboarding flow
    await ctx.reply(
      `<b>👋 Привет! Я — Digest Bot</b>\n\n` +
        `Я собираю посты из твоих Telegram-каналов и делаю из них удобный дайджест.\n\n` +
        `<b>Как это работает:</b>\n` +
        `1️⃣ Добавь каналы, которые хочешь отслеживать\n` +
        `2️⃣ Нажми «Дайджест» — получишь сводку новостей\n` +
        `3️⃣ Включи AI-режим для умного саммари\n\n` +
        `<b>Начнём?</b> Добавь первый канал 👇`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("➕ Добавить первый канал", "add_channel")],
          [Markup.button.callback("❓ Как это выглядит?", "show_example_digest")],
        ]),
      }
    );
  } else {
    // Returning user: show full menu with status
    const messageCount = await prisma.message.count();
    const lastDigest = await prisma.digest.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let statusLine = `📊 <b>${channelCount}</b> канал(ов), <b>${messageCount}</b> сообщений в базе`;
    if (lastDigest) {
      const ago = formatTimeAgo(lastDigest.createdAt);
      statusLine += `\n📰 Последний дайджест: ${ago}`;
    }

    await ctx.reply(
      `<b>📰 Telegram Digest Bot</b>\n\n` +
        `${statusLine}\n\n` +
        `Выберите действие:`,
      { parse_mode: "HTML", ...mainMenuKeyboard() }
    );
  }
}

/**
 * Format a date as "X minutes/hours/days ago" in Russian.
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
