import { Context } from "telegraf";
import { prisma } from "../../db/prisma";

export async function removeCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  if (args.length === 0) {
    await ctx.reply("Использование: /remove @channel_username\nПример: /remove @durov");
    return;
  }

  const channelInput = args[0].replace(/^@/, "");

  const channel = await prisma.channel.findFirst({
    where: {
      OR: [
        { username: channelInput },
        { title: channelInput },
      ],
    },
  });

  if (!channel) {
    await ctx.reply(`Канал "${channelInput}" не найден в списке отслеживаемых.`);
    return;
  }

  await prisma.channel.update({
    where: { id: channel.id },
    data: { isActive: false },
  });

  await ctx.reply(`Канал "<b>${escapeHtml(channel.title)}</b>" деактивирован.`, {
    parse_mode: "HTML",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
