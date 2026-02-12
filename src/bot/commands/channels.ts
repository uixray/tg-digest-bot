import { Context } from "telegraf";
import { prisma } from "../../db/prisma";
import { getTypeLabel } from "../../db/seed-types";

export async function channelsCommand(ctx: Context) {
  const channels = await prisma.channel.findMany({
    orderBy: [{ typeId: "asc" }, { addedAt: "asc" }],
    include: { type: true },
  });

  if (channels.length === 0) {
    await ctx.reply("Список каналов пуст. Добавьте канал командой /add @channel");
    return;
  }

  // Group channels by type
  const grouped = new Map<string, typeof channels>();

  for (const ch of channels) {
    const typeName = ch.type?.name || "_none";
    if (!grouped.has(typeName)) {
      grouped.set(typeName, []);
    }
    grouped.get(typeName)!.push(ch);
  }

  let text = `<b>Отслеживаемые каналы (${channels.length}):</b>\n`;

  // Sort: types with emoji first, then "no type"
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    if (a[0] === "_none") return 1;
    if (b[0] === "_none") return -1;
    return a[0].localeCompare(b[0]);
  });

  for (const [typeName, chList] of sortedGroups) {
    const typeChannel = chList[0];
    const emoji = typeChannel.type?.emoji || "📁";
    const label = typeName === "_none" ? "Без типа" : getTypeLabel(typeName);

    text += `\n<b>${emoji} ${label}:</b>\n`;

    for (const ch of chList) {
      const status = ch.isActive ? "✅" : "❌";
      const username = ch.username ? `@${ch.username}` : `ID:${ch.telegramId}`;
      text += `  ${status} ${escapeHtml(ch.title)} <code>${username}</code>\n`;
    }
  }

  await ctx.reply(text, { parse_mode: "HTML" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
