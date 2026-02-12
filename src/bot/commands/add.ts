import { Context, Markup } from "telegraf";
import { getUserbot } from "../../userbot/client";
import { prisma } from "../../db/prisma";
import { Api } from "telegram";
import { getAllChannelTypes, getTypeLabel } from "../../db/seed-types";

// Temporary storage for pending channel additions (channelInput -> userId)
const pendingChannels = new Map<number, {
  channelInput: string;
  telegramId: bigint;
  title: string;
  username: string | null;
}>();

export async function addCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length === 0) {
    await ctx.reply(
      "Использование:\n" +
      "/add @channel_username — добавить с выбором типа\n" +
      "/add @channel_username news — добавить сразу с типом\n\n" +
      "Типы: personal, company, digest, news, tech, other"
    );
    return;
  }

  const channelInput = args[0].replace(/^@/, "");
  const typeName = args[1]?.toLowerCase();

  try {
    await ctx.reply(`Ищу канал "${channelInput}"...`);

    const client = await getUserbot();
    const entity = await client.getEntity(channelInput);

    if (!(entity instanceof Api.Channel) && !(entity instanceof Api.Chat)) {
      await ctx.reply("Это не канал или группа. Укажите username канала.");
      return;
    }

    const telegramId = BigInt(entity.id.valueOf());
    const title = "title" in entity ? entity.title : channelInput;
    const username = "username" in entity && entity.username ? entity.username : null;

    // Check if already exists
    const existing = await prisma.channel.findUnique({
      where: { telegramId },
      include: { type: true },
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.channel.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        const typeLabel = existing.type ? ` (${existing.type.emoji} ${getTypeLabel(existing.type.name)})` : "";
        await ctx.reply(`Канал "<b>${escapeHtml(title)}</b>"${typeLabel} снова активирован.`, {
          parse_mode: "HTML",
        });
      } else {
        const typeLabel = existing.type ? ` (${existing.type.emoji} ${getTypeLabel(existing.type.name)})` : "";
        await ctx.reply(`Канал "<b>${escapeHtml(title)}</b>"${typeLabel} уже отслеживается.`, {
          parse_mode: "HTML",
        });
      }
      return;
    }

    // If type specified directly — add immediately
    if (typeName) {
      const type = await prisma.channelType.findUnique({ where: { name: typeName } });

      await prisma.channel.create({
        data: {
          telegramId,
          username,
          title,
          typeId: type?.id || null,
        },
      });

      const typeLabel = type ? ` как ${type.emoji} ${getTypeLabel(type.name)}` : "";
      await ctx.reply(`Канал "<b>${escapeHtml(title)}</b>" добавлен${typeLabel}.`, {
        parse_mode: "HTML",
      });
      return;
    }

    // Otherwise — show type selection buttons
    const userId = ctx.from?.id;
    if (!userId) return;

    pendingChannels.set(userId, { channelInput, telegramId, title, username });

    const types = await getAllChannelTypes();
    const buttons = types.map((t) =>
      Markup.button.callback(`${t.emoji} ${getTypeLabel(t.name)}`, `add_type:${t.name}`)
    );

    // Arrange in rows of 2
    const keyboard: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback("❌ Без типа", "add_type:none")]);

    await ctx.reply(
      `Канал "<b>${escapeHtml(title)}</b>" найден.\n\nВыберите тип канала:`,
      { parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard) }
    );
  } catch (err: any) {
    console.error("[Add] Error:", err.message);
    await ctx.reply(`Ошибка: не удалось найти канал "${channelInput}". Проверьте username.`);
  }
}

/**
 * Handle type selection button press.
 */
export async function handleAddTypeAction(ctx: Context, typeName: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const pending = pendingChannels.get(userId);
  if (!pending) {
    await ctx.answerCbQuery("Сессия добавления истекла. Попробуйте /add снова.");
    return;
  }

  pendingChannels.delete(userId);

  try {
    // Double-check channel doesn't exist
    const existing = await prisma.channel.findUnique({
      where: { telegramId: pending.telegramId },
    });

    if (existing) {
      await ctx.answerCbQuery("Канал уже добавлен");
      await ctx.editMessageText(`Канал "<b>${escapeHtml(pending.title)}</b>" уже отслеживается.`, {
        parse_mode: "HTML",
      });
      return;
    }

    let typeId: number | null = null;
    let typeLabel = "";

    if (typeName !== "none") {
      const type = await prisma.channelType.findUnique({ where: { name: typeName } });
      if (type) {
        typeId = type.id;
        typeLabel = ` как ${type.emoji} ${getTypeLabel(type.name)}`;
      }
    }

    await prisma.channel.create({
      data: {
        telegramId: pending.telegramId,
        username: pending.username,
        title: pending.title,
        typeId,
      },
    });

    await ctx.answerCbQuery("Канал добавлен!");
    await ctx.editMessageText(
      `Канал "<b>${escapeHtml(pending.title)}</b>" добавлен${typeLabel}.`,
      { parse_mode: "HTML" }
    );
  } catch (err: any) {
    console.error("[Add] Error saving channel:", err.message);
    await ctx.answerCbQuery("Ошибка сохранения");
  }
}

/**
 * Update the type of an existing channel.
 */
export async function setTypeCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.reply(
      "Использование: /settype @channel_username тип\n" +
      "Пример: /settype @durov news\n\n" +
      "Типы: personal, company, digest, news, tech, other\n" +
      "Или имя вашего кастомного типа."
    );
    return;
  }

  const channelInput = args[0].replace(/^@/, "");
  const typeName = args[1].toLowerCase();

  const channel = await prisma.channel.findFirst({
    where: {
      OR: [
        { username: channelInput },
        { title: { contains: channelInput, mode: "insensitive" } },
      ],
    },
  });

  if (!channel) {
    await ctx.reply(`Канал "${channelInput}" не найден в списке отслеживаемых.`);
    return;
  }

  const type = await prisma.channelType.findUnique({ where: { name: typeName } });

  await prisma.channel.update({
    where: { id: channel.id },
    data: { typeId: type?.id || null },
  });

  const typeLabel = type ? `${type.emoji} ${getTypeLabel(type.name)}` : "без типа";
  await ctx.reply(
    `Тип канала "<b>${escapeHtml(channel.title)}</b>" изменён на: ${typeLabel}`,
    { parse_mode: "HTML" }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
