import { Context, Markup } from "telegraf";
import { config } from "../../config";
import { prisma } from "../../db/prisma";

/**
 * Parse cron expression to human-readable Russian text.
 */
function parseCronToHuman(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (dayOfMonth === "*" && month === "*") {
    if (dayOfWeek === "*") {
      return `Ежедневно в ${hour}:${minute.padStart(2, "0")}`;
    }
    if (dayOfWeek === "1-5") {
      return `По будням в ${hour}:${minute.padStart(2, "0")}`;
    }
    if (dayOfWeek === "1") {
      return `По понедельникам в ${hour}:${minute.padStart(2, "0")}`;
    }
    if (dayOfWeek === "0" || dayOfWeek === "7") {
      return `По воскресеньям в ${hour}:${minute.padStart(2, "0")}`;
    }
  }

  // Multiple hours
  if (hour.includes(",")) {
    const hours = hour.split(",").join(":00, ") + ":00";
    return `Ежедневно в ${hours}`;
  }

  // Every X minutes/hours
  if (minute.startsWith("*/")) {
    const interval = minute.slice(2);
    return `Каждые ${interval} минут`;
  }
  if (hour.startsWith("*/")) {
    const interval = hour.slice(2);
    return `Каждые ${interval} часов`;
  }

  return cron; // Fallback to raw expression
}

/**
 * Get AI provider display name.
 */
function getAIProviderLabel(provider: string): string {
  switch (provider) {
    case "lmstudio":
      return "🖥 LM Studio (локальный)";
    case "yandexgpt":
      return "☁️ YandexGPT (облако)";
    case "none":
      return "❌ Отключён";
    default:
      return provider;
  }
}

/**
 * /settings — Show current settings with human-readable values.
 */
export async function settingsCommand(ctx: Context) {
  const cronSetting = await prisma.settings.findUnique({ where: { key: "digest_cron" } });
  const aiSetting = await prisma.settings.findUnique({ where: { key: "ai_provider" } });

  const cron = cronSetting?.value || config.digestCron;
  const ai = aiSetting?.value || config.aiProvider;
  const timezone = config.digestTimezone;

  const channels = await prisma.channel.count({ where: { isActive: true } });
  const messages = await prisma.message.count();

  const cronHuman = parseCronToHuman(cron);

  await ctx.reply(
    `<b>⚙️ Настройки</b>\n\n` +
      `<b>Автодайджест:</b>\n` +
      `  📅 ${cronHuman}\n` +
      `  🕐 Часовой пояс: ${timezone}\n` +
      `  <code>${cron}</code>\n\n` +
      `<b>AI-суммаризация:</b>\n` +
      `  ${getAIProviderLabel(ai)}\n\n` +
      `<b>Статистика:</b>\n` +
      `  📋 Каналов: ${channels}\n` +
      `  💬 Сообщений в базе: ${messages}`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("📅 Расписание", "settings_cron"),
          Markup.button.callback("🤖 AI", "settings_ai"),
        ],
        [Markup.button.callback("🏠 Меню", "back_to_menu")],
      ]),
    }
  );
}

/**
 * Cron presets selection.
 */
export async function showCronPresets(ctx: Context) {
  await ctx.reply(
    `<b>📅 Выберите расписание автодайджеста:</b>\n\n` +
      `Бот будет автоматически отправлять дайджест по выбранному расписанию.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🌅 Каждый день в 9:00", "cron_daily_9")],
        [Markup.button.callback("🌅 Каждый день в 8:00", "cron_daily_8")],
        [Markup.button.callback("💼 По будням в 9:00", "cron_weekdays")],
        [Markup.button.callback("📆 По понедельникам", "cron_weekly")],
        [Markup.button.callback("🔔 Дважды в день (9:00, 18:00)", "cron_twice")],
        [Markup.button.callback("❌ Отключить автодайджест", "cron_disable")],
        [Markup.button.callback("⌨️ Ввести вручную", "cron_custom")],
        [Markup.button.callback("◀️ Назад", "show_settings")],
      ]),
    }
  );
}

/**
 * AI provider selection.
 */
export async function showAIProviders(ctx: Context) {
  const aiSetting = await prisma.settings.findUnique({ where: { key: "ai_provider" } });
  const current = aiSetting?.value || config.aiProvider;

  const mark = (provider: string) => (current === provider ? " ✓" : "");

  await ctx.reply(
    `<b>🤖 Выберите AI-провайдер:</b>\n\n` +
      `AI создаёт краткую сводку из всех сообщений — выделяет главное и группирует по темам.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🖥 LM Studio (локальный)${mark("lmstudio")}`, "ai_lmstudio")],
        [Markup.button.callback(`☁️ YandexGPT (облако)${mark("yandexgpt")}`, "ai_yandexgpt")],
        [Markup.button.callback(`❌ Отключить AI${mark("none")}`, "ai_none")],
        [Markup.button.callback("◀️ Назад", "show_settings")],
      ]),
    }
  );
}

/**
 * Handle cron preset selection.
 */
export async function handleCronPreset(ctx: Context, preset: string) {
  const cronExpressions: Record<string, string> = {
    daily_9: "0 9 * * *",
    daily_8: "0 8 * * *",
    weekdays: "0 9 * * 1-5",
    weekly: "0 9 * * 1",
    twice: "0 9,18 * * *",
    disable: "",
  };

  const value = cronExpressions[preset];

  if (preset === "disable") {
    await prisma.settings.upsert({
      where: { key: "digest_cron" },
      update: { value: "" },
      create: { key: "digest_cron", value: "" },
    });
    await ctx.answerCbQuery("Автодайджест отключён");
    await ctx.editMessageText(
      "❌ Автодайджест отключён.\n\n" +
        "Вы можете запрашивать дайджест вручную через меню.",
      Markup.inlineKeyboard([[Markup.button.callback("🏠 Меню", "back_to_menu")]])
    );
    return;
  }

  if (preset === "custom") {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `<b>⌨️ Ввод расписания вручную</b>\n\n` +
        `Отправьте cron-выражение в формате:\n` +
        `<code>/set cron минуты часы день месяц день_недели</code>\n\n` +
        `Примеры:\n` +
        `<code>/set cron 0 9 * * *</code> — каждый день в 9:00\n` +
        `<code>/set cron 30 8 * * 1-5</code> — будни в 8:30\n` +
        `<code>/set cron 0 */3 * * *</code> — каждые 3 часа`,
      { parse_mode: "HTML" }
    );
    return;
  }

  if (value) {
    await prisma.settings.upsert({
      where: { key: "digest_cron" },
      update: { value },
      create: { key: "digest_cron", value },
    });

    const humanReadable = parseCronToHuman(value);
    await ctx.answerCbQuery("Расписание обновлено");
    await ctx.editMessageText(
      `✅ Расписание установлено:\n\n` +
        `📅 ${humanReadable}\n` +
        `<code>${value}</code>\n\n` +
        `<i>Перезапустите бота, чтобы применить изменения.</i>`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("🏠 Меню", "back_to_menu")]]),
      }
    );
  }
}

/**
 * Handle AI provider selection.
 */
export async function handleAIProvider(ctx: Context, provider: string) {
  await prisma.settings.upsert({
    where: { key: "ai_provider" },
    update: { value: provider },
    create: { key: "ai_provider", value: provider },
  });

  const label = getAIProviderLabel(provider);
  await ctx.answerCbQuery("AI-провайдер обновлён");
  await ctx.editMessageText(
    `✅ AI-провайдер установлен:\n\n${label}`,
    Markup.inlineKeyboard([[Markup.button.callback("🏠 Меню", "back_to_menu")]])
  );
}

/**
 * /set command — manual settings.
 */
export async function setCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.reply(
      "Использование:\n" +
        "/set cron <выражение> — расписание\n" +
        "/set ai yandexgpt|lmstudio|none — AI-провайдер\n\n" +
        "Или используйте кнопки в /settings"
    );
    return;
  }

  const [key, ...valueParts] = args;
  const value = valueParts.join(" ");

  switch (key) {
    case "cron":
      await prisma.settings.upsert({
        where: { key: "digest_cron" },
        update: { value },
        create: { key: "digest_cron", value },
      });
      const humanReadable = parseCronToHuman(value);
      await ctx.reply(
        `✅ Расписание обновлено:\n\n` +
          `📅 ${humanReadable}\n` +
          `<code>${value}</code>\n\n` +
          `<i>Перезапустите бота, чтобы применить изменения.</i>`,
        { parse_mode: "HTML" }
      );
      break;

    case "ai":
      if (!["yandexgpt", "lmstudio", "none"].includes(value)) {
        await ctx.reply("Доступные провайдеры: yandexgpt, lmstudio, none");
        return;
      }
      await prisma.settings.upsert({
        where: { key: "ai_provider" },
        update: { value },
        create: { key: "ai_provider", value },
      });
      await ctx.reply(`✅ AI-провайдер: ${getAIProviderLabel(value)}`, { parse_mode: "HTML" });
      break;

    default:
      await ctx.reply(`Неизвестная настройка: ${key}`);
  }
}
