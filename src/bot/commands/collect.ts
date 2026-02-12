import { Context } from "telegraf";
import { collectAll } from "../../userbot/collector";

export async function collectCommand(ctx: Context) {
  await ctx.reply("Собираю новые сообщения...");

  try {
    const result = await collectAll();
    await ctx.reply(
      `Сбор завершён.\n` +
        `Каналов обработано: ${result.channels}\n` +
        `Сообщений сохранено: ${result.total}`
    );
  } catch (err: any) {
    console.error("[Collect] Error:", err.message);
    await ctx.reply(`Ошибка при сборе: ${err.message}`);
  }
}
