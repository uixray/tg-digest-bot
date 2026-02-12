import { Context, Markup } from "telegraf";
import { prisma } from "../../db/prisma";
import {
  getAllChannelTypes,
  getTypeLabel,
  createCustomType,
  deleteCustomType,
} from "../../db/seed-types";

/**
 * /types — List all channel types (built-in and custom).
 */
export async function typesCommand(ctx: Context) {
  const types = await getAllChannelTypes();

  let text = "<b>Типы каналов:</b>\n\n";
  text += "<b>Встроенные:</b>\n";

  const builtinTypes = types.filter((t) => t.isBuiltin);
  const customTypes = types.filter((t) => !t.isBuiltin);

  for (const t of builtinTypes) {
    const count = await prisma.channel.count({ where: { typeId: t.id, isActive: true } });
    text += `  ${t.emoji} <code>${t.name}</code> — ${getTypeLabel(t.name)} (${count})\n`;
  }

  if (customTypes.length > 0) {
    text += "\n<b>Кастомные:</b>\n";
    for (const t of customTypes) {
      const count = await prisma.channel.count({ where: { typeId: t.id, isActive: true } });
      text += `  ${t.emoji} <code>${t.name}</code> (${count})\n`;
    }
  }

  text += "\n<b>Команды:</b>\n";
  text += "/addtype имя эмодзи — добавить тип\n";
  text += "/deltype имя — удалить кастомный тип";

  await ctx.reply(text, { parse_mode: "HTML" });
}

/**
 * /addtype name emoji — Create a custom channel type.
 */
export async function addTypeCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length === 0) {
    await ctx.reply(
      "Использование: /addtype имя [эмодзи]\n\n" +
      "Пример:\n" +
      "/addtype crypto\n" +
      "/addtype finance 💰\n\n" +
      "Имя должно быть на латинице, без пробелов."
    );
    return;
  }

  const name = args[0].toLowerCase();
  const emoji = args[1] || "📁";

  // Validate name
  if (!/^[a-z0-9_-]+$/.test(name)) {
    await ctx.reply("Имя типа должно содержать только латинские буквы, цифры, - и _");
    return;
  }

  if (name.length > 20) {
    await ctx.reply("Имя типа слишком длинное (максимум 20 символов).");
    return;
  }

  // Check if exists
  const existing = await prisma.channelType.findUnique({ where: { name } });
  if (existing) {
    await ctx.reply(`Тип "${name}" уже существует.`);
    return;
  }

  try {
    await createCustomType(name, emoji);
    await ctx.reply(`Тип ${emoji} <code>${name}</code> создан.`, { parse_mode: "HTML" });
  } catch (err: any) {
    console.error("[AddType] Error:", err.message);
    await ctx.reply(`Ошибка создания типа: ${err.message}`);
  }
}

/**
 * /deltype name — Delete a custom channel type.
 */
export async function delTypeCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length === 0) {
    await ctx.reply("Использование: /deltype имя\nПример: /deltype crypto");
    return;
  }

  const name = args[0].toLowerCase();

  const type = await prisma.channelType.findUnique({ where: { name } });
  if (!type) {
    await ctx.reply(`Тип "${name}" не найден.`);
    return;
  }

  if (type.isBuiltin) {
    await ctx.reply(`Нельзя удалить встроенный тип "${name}".`);
    return;
  }

  const channelCount = await prisma.channel.count({ where: { typeId: type.id } });

  if (channelCount > 0) {
    // Ask for confirmation
    await ctx.reply(
      `Тип "${name}" используется в ${channelCount} канал(ах).\n` +
      `При удалении эти каналы останутся без типа.\n\n` +
      `Удалить?`,
      Markup.inlineKeyboard([
        Markup.button.callback("Да, удалить", `deltype_confirm:${name}`),
        Markup.button.callback("Отмена", "deltype_cancel"),
      ])
    );
    return;
  }

  const deleted = await deleteCustomType(name);
  if (deleted) {
    await ctx.reply(`Тип "${name}" удалён.`);
  } else {
    await ctx.reply(`Не удалось удалить тип "${name}".`);
  }
}

/**
 * Handle delete confirmation button.
 */
export async function handleDelTypeConfirm(ctx: Context, typeName: string) {
  const deleted = await deleteCustomType(typeName);

  if (deleted) {
    await ctx.answerCbQuery("Тип удалён");
    await ctx.editMessageText(`Тип "${typeName}" удалён.`);
  } else {
    await ctx.answerCbQuery("Ошибка удаления");
    await ctx.editMessageText(`Не удалось удалить тип "${typeName}".`);
  }
}

/**
 * Handle delete cancel button.
 */
export async function handleDelTypeCancel(ctx: Context) {
  await ctx.answerCbQuery("Отменено");
  await ctx.editMessageText("Удаление отменено.");
}
