import { Context } from "telegraf";

export async function helpCommand(ctx: Context) {
  await ctx.reply(
    `<b>Доступные команды:</b>\n\n` +
      `<b>Дайджест:</b>\n` +
      `/digest — дайджест (простая агрегация)\n` +
      `/digest ai — дайджест с AI-суммаризацией\n` +
      `/digest 24h — дайджест за последние 24 часа\n` +
      `/digest 3d ai — комбинация периода и AI\n\n` +
      `<b>Каналы:</b>\n` +
      `/channels — список отслеживаемых каналов\n` +
      `/add @channel — добавить канал (с выбором типа)\n` +
      `/add @channel news — добавить сразу с типом\n` +
      `/remove @channel — убрать канал\n` +
      `/settype @channel тип — изменить тип канала\n\n` +
      `<b>Типы каналов:</b>\n` +
      `/types — список всех типов\n` +
      `/addtype имя 🏷 — создать свой тип\n` +
      `/deltype имя — удалить кастомный тип\n\n` +
      `<b>Прочее:</b>\n` +
      `/collect — собрать новые сообщения\n` +
      `/settings — текущие настройки\n` +
      `/set cron &lt;выражение&gt; — изменить расписание\n` +
      `/set ai &lt;provider&gt; — сменить AI-провайдер\n` +
      `/menu — интерактивное меню`,
    { parse_mode: "HTML" }
  );
}
