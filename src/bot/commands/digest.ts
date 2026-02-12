import { Context } from "telegraf";
import { collectAll } from "../../userbot/collector";
import { buildDigest } from "../../digest/builder";
import { formatDigest, splitMessage } from "../../digest/formatter";

function parsePeriod(arg: string): Date | null {
  const match = arg.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case "h":
      return new Date(now.getTime() - amount * 60 * 60 * 1000);
    case "d":
      return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
    case "w":
      return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function digestCommand(ctx: Context) {
  const text = (ctx.message && "text" in ctx.message) ? ctx.message.text : "";
  const args = text.split(/\s+/).slice(1);

  let withAI = false;
  let since: Date | undefined;

  for (const arg of args) {
    if (arg === "ai") {
      withAI = true;
    } else {
      const parsed = parsePeriod(arg);
      if (parsed) {
        since = parsed;
      }
    }
  }

  try {
    // Step 1: Collect fresh messages
    await ctx.reply("Собираю свежие сообщения...");
    await collectAll(since);

    // Step 2: Build digest
    await ctx.reply(withAI ? "Формирую дайджест с AI-суммаризацией..." : "Формирую дайджест...");
    const digest = await buildDigest(since, withAI);

    if (!digest) {
      await ctx.reply("Нет новых сообщений за указанный период.");
      return;
    }

    // Step 3: Format and send
    const html = formatDigest(digest);
    const parts = splitMessage(html);

    for (const part of parts) {
      await ctx.reply(part, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  } catch (err: any) {
    console.error("[Digest] Error:", err.message);
    await ctx.reply(`Ошибка формирования дайджеста: ${err.message}`);
  }
}
