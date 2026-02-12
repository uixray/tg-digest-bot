import { Telegraf } from "telegraf";
import { config } from "../config";
import { ownerOnly } from "./middleware/auth";
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";
import { channelsCommand } from "./commands/channels";
import { addCommand, handleAddTypeAction, setTypeCommand } from "./commands/add";
import { removeCommand } from "./commands/remove";
import { collectCommand } from "./commands/collect";
import { digestCommand } from "./commands/digest";
import {
  settingsCommand,
  setCommand,
  showCronPresets,
  showAIProviders,
  handleCronPreset,
  handleAIProvider,
} from "./commands/settings";
import { menuCommand, mainMenuKeyboard, showExampleDigest, quickMenuKeyboard } from "./commands/menu";
import {
  typesCommand,
  addTypeCommand,
  delTypeCommand,
  handleDelTypeConfirm,
  handleDelTypeCancel,
} from "./commands/types";
import {
  showFilterMenu,
  handleFilterToggle,
  handleFilterAll,
  handleFilterNone,
  getFilteredChannelIds,
  clearUserFilter,
} from "./commands/filter";
import { collectAll } from "../userbot/collector";
import { buildDigest } from "../digest/builder";
import { formatDigest, splitMessage } from "../digest/formatter";

export function createBot(): Telegraf {
  const bot = new Telegraf(config.botToken);

  // Restrict to owner
  bot.use(ownerOnly);

  // Commands
  bot.start(startCommand);
  bot.help(helpCommand);
  bot.command("menu", menuCommand);
  bot.command("channels", channelsCommand);
  bot.command("add", addCommand);
  bot.command("remove", removeCommand);
  bot.command("collect", collectCommand);
  bot.command("digest", digestCommand);
  bot.command("settings", settingsCommand);
  bot.command("set", setCommand);

  // Type management commands
  bot.command("types", typesCommand);
  bot.command("addtype", addTypeCommand);
  bot.command("deltype", delTypeCommand);
  bot.command("settype", setTypeCommand);

  // ===== Inline button handlers =====

  // Digest buttons
  bot.action("digest_simple", async (ctx) => {
    await ctx.answerCbQuery();
    await handleDigest(ctx, undefined, false);
  });

  bot.action("digest_ai", async (ctx) => {
    await ctx.answerCbQuery();
    await handleDigest(ctx, undefined, true);
  });

  bot.action("digest_24h", async (ctx) => {
    await ctx.answerCbQuery();
    await handleDigest(ctx, new Date(Date.now() - 24 * 60 * 60 * 1000), false);
  });

  bot.action("digest_3d", async (ctx) => {
    await ctx.answerCbQuery();
    await handleDigest(ctx, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), false);
  });

  bot.action("digest_1w", async (ctx) => {
    await ctx.answerCbQuery();
    await handleDigest(ctx, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), false);
  });

  // Filter button
  bot.action("digest_filter", async (ctx) => {
    await ctx.answerCbQuery();
    await showFilterMenu(ctx);
  });

  // Filter toggle
  bot.action(/^filter_toggle:(\d+)$/, async (ctx) => {
    await handleFilterToggle(ctx, ctx.match[1]);
  });

  bot.action("filter_all", async (ctx) => {
    await handleFilterAll(ctx);
  });

  bot.action("filter_none", async (ctx) => {
    await handleFilterNone(ctx);
  });

  // Apply filter and generate digest
  bot.action("filter_apply", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const channelIds = await getFilteredChannelIds(userId);

    if (channelIds && channelIds.length === 0) {
      await ctx.reply("⚠️ Не выбрано ни одного типа канала.", quickMenuKeyboard());
      return;
    }

    await handleDigest(ctx, undefined, false, channelIds);
    clearUserFilter(userId);
  });

  // Channels button
  bot.action("show_channels", async (ctx) => {
    await ctx.answerCbQuery();
    await channelsCommand(ctx);
  });

  // Add channel button — prompt user
  bot.action("add_channel", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📝 <b>Добавление канала</b>\n\n" +
        "Отправьте username канала в формате:\n" +
        "<code>/add @channel_name</code>\n\n" +
        "Например: <code>/add @design_news</code>",
      { parse_mode: "HTML" }
    );
  });

  // Collect button
  bot.action("collect", async (ctx) => {
    await ctx.answerCbQuery();
    await collectCommand(ctx);
  });

  // Settings button
  bot.action("show_settings", async (ctx) => {
    await ctx.answerCbQuery();
    await settingsCommand(ctx);
  });

  // Settings sub-menus
  bot.action("settings_cron", async (ctx) => {
    await ctx.answerCbQuery();
    await showCronPresets(ctx);
  });

  bot.action("settings_ai", async (ctx) => {
    await ctx.answerCbQuery();
    await showAIProviders(ctx);
  });

  // Cron presets
  bot.action(/^cron_(.+)$/, async (ctx) => {
    await handleCronPreset(ctx, ctx.match[1]);
  });

  // AI provider selection
  bot.action(/^ai_(.+)$/, async (ctx) => {
    await handleAIProvider(ctx, ctx.match[1]);
  });

  // Help button
  bot.action("show_help", async (ctx) => {
    await ctx.answerCbQuery();
    await helpCommand(ctx);
  });

  // Example digest (onboarding)
  bot.action("show_example_digest", async (ctx) => {
    await ctx.answerCbQuery();
    await showExampleDigest(ctx);
  });

  // Back to menu
  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await menuCommand(ctx);
  });

  // ===== Type selection handlers =====

  // Handle type selection when adding a channel
  bot.action(/^add_type:(.+)$/, async (ctx) => {
    const typeName = ctx.match[1];
    await handleAddTypeAction(ctx, typeName);
  });

  // Handle delete type confirmation
  bot.action(/^deltype_confirm:(.+)$/, async (ctx) => {
    const typeName = ctx.match[1];
    await handleDelTypeConfirm(ctx, typeName);
  });

  bot.action("deltype_cancel", async (ctx) => {
    await handleDelTypeCancel(ctx);
  });

  return bot;
}

// Shared digest handler for buttons
async function handleDigest(
  ctx: any,
  since: Date | undefined,
  withAI: boolean,
  channelIds?: number[] | null
) {
  try {
    await ctx.reply(withAI ? "🤖 Собираю и суммаризирую..." : "📰 Собираю дайджест...");
    await collectAll(since);

    const digest = await buildDigest(since, withAI, channelIds);

    if (!digest) {
      await ctx.reply("Нет новых сообщений за указанный период.", quickMenuKeyboard());
      return;
    }

    const html = formatDigest(digest);
    const parts = splitMessage(html);

    for (const part of parts) {
      await ctx.reply(part, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }

    // Show quick menu after digest
    await ctx.reply("Что дальше?", quickMenuKeyboard());
  } catch (err: any) {
    console.error("[Digest] Error:", err.message);
    await ctx.reply(`Ошибка: ${err.message}`, quickMenuKeyboard());
  }
}
