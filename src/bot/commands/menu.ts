import { Context, Markup } from "telegraf";
import { prisma } from "../../db/prisma";

/**
 * Main menu keyboard with improved layout.
 * Groups related actions logically.
 */
export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    // Row 1: Primary actions - digest generation
    [
      Markup.button.callback("📰 Дайджест", "digest_simple"),
      Markup.button.callback("🤖 AI-сводка", "digest_ai"),
    ],
    // Row 2: Period selection (clearly labeled)
    [
      Markup.button.callback("24ч", "digest_24h"),
      Markup.button.callback("3 дня", "digest_3d"),
      Markup.button.callback("Неделя", "digest_1w"),
      Markup.button.callback("🎯 Фильтр", "digest_filter"),
    ],
    // Row 3: Channel management
    [
      Markup.button.callback("📋 Мои каналы", "show_channels"),
      Markup.button.callback("➕ Добавить", "add_channel"),
    ],
    // Row 4: Settings and help
    [
      Markup.button.callback("⚙️ Настройки", "show_settings"),
      Markup.button.callback("❓ Помощь", "show_help"),
    ],
  ]);
}

/**
 * Compact menu for post-action context.
 */
export function quickMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📰 Ещё дайджест", "digest_simple"),
      Markup.button.callback("🏠 Меню", "back_to_menu"),
    ],
  ]);
}

/**
 * /menu command — shows main menu.
 */
export async function menuCommand(ctx: Context) {
  const channelCount = await prisma.channel.count({ where: { isActive: true } });

  let headerText = "<b>📰 Telegram Digest Bot</b>\n\n";

  if (channelCount === 0) {
    headerText += "⚠️ <i>Каналы не добавлены</i>\n\n";
    headerText += "Добавьте каналы, чтобы получать дайджесты.";
  } else {
    headerText += `<b>${channelCount}</b> канал(ов) отслеживается\n\n`;
    headerText += "Выберите действие:";
  }

  await ctx.reply(headerText, { parse_mode: "HTML", ...mainMenuKeyboard() });
}

/**
 * Example digest for onboarding.
 */
export async function showExampleDigest(ctx: Context) {
  const exampleDigest = `
<b>📰 Пример дайджеста</b>

Вот как выглядит дайджест — сводка постов из ваших каналов за выбранный период.

━━━━━━━━━━━━━━━━━━
<b>🏢 Дизайн-канал</b>

  10:30 Новый тренд в UI: градиенты возвращаются... 🖼
  14:15 Figma выпустила обновление с AI-функциями 🎬

━━━━━━━━━━━━━━━━━━
<b>📢 Tech News</b>

  09:00 Apple анонсировала новые устройства
  16:45 🖼 Фото с презентации

━━━━━━━━━━━━━━━━━━
<b>🤖 AI-итоги:</b>

Главные темы дня: обновления дизайн-инструментов (Figma AI), тренды в UI-дизайне, анонсы Apple.

━━━━━━━━━━━━━━━━━━
<i>Это пример. Добавьте каналы, чтобы получать реальные дайджесты!</i>
`;

  await ctx.reply(exampleDigest, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("➕ Добавить канал", "add_channel")],
      [Markup.button.callback("🏠 В меню", "back_to_menu")],
    ]),
  });
}
