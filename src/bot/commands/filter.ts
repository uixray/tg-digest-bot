import { Context, Markup } from "telegraf";
import { prisma } from "../../db/prisma";
import { getTypeLabel } from "../../db/seed-types";

// Store user's active filters (in-memory, resets on restart)
const userFilters = new Map<number, Set<number>>();

/**
 * Get current filter for user, or all active channels if no filter set.
 */
export function getUserFilter(userId: number): Set<number> | null {
  return userFilters.get(userId) || null;
}

/**
 * Clear user's filter.
 */
export function clearUserFilter(userId: number): void {
  userFilters.delete(userId);
}

/**
 * Show filter selection UI.
 */
export async function showFilterMenu(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const types = await prisma.channelType.findMany({
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { channels: { where: { isActive: true } } } },
    },
  });

  // Count channels without type
  const noTypeCount = await prisma.channel.count({
    where: { isActive: true, typeId: null },
  });

  const currentFilter = userFilters.get(userId);

  // Build buttons
  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

  // Add type buttons
  for (const type of types) {
    if (type._count.channels === 0) continue;

    const isSelected = currentFilter?.has(type.id) ?? true; // Default: all selected
    const mark = isSelected ? "✓ " : "○ ";
    const label = `${mark}${type.emoji} ${getTypeLabel(type.name)} (${type._count.channels})`;

    buttons.push([Markup.button.callback(label, `filter_toggle:${type.id}`)]);
  }

  // Add "no type" option if there are such channels
  if (noTypeCount > 0) {
    const isSelected = currentFilter?.has(0) ?? true;
    const mark = isSelected ? "✓ " : "○ ";
    buttons.push([
      Markup.button.callback(`${mark}📁 Без типа (${noTypeCount})`, "filter_toggle:0"),
    ]);
  }

  // Action buttons
  buttons.push([
    Markup.button.callback("✅ Выбрать все", "filter_all"),
    Markup.button.callback("❌ Очистить", "filter_none"),
  ]);

  buttons.push([
    Markup.button.callback("📰 Применить и создать дайджест", "filter_apply"),
  ]);

  buttons.push([Markup.button.callback("🏠 Меню", "back_to_menu")]);

  await ctx.reply(
    `<b>🎯 Фильтр каналов</b>\n\n` +
      `Выберите типы каналов для включения в дайджест.\n` +
      `Отмеченные (✓) будут включены.`,
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
  );
}

/**
 * Toggle a type in user's filter.
 */
export async function handleFilterToggle(ctx: Context, typeIdStr: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const typeId = parseInt(typeIdStr, 10);

  // Initialize filter if not exists (default: all selected)
  if (!userFilters.has(userId)) {
    const allTypes = await prisma.channelType.findMany();
    const typeIds = new Set(allTypes.map((t) => t.id));
    typeIds.add(0); // Include "no type"
    userFilters.set(userId, typeIds);
  }

  const filter = userFilters.get(userId)!;

  // Toggle
  if (filter.has(typeId)) {
    filter.delete(typeId);
  } else {
    filter.add(typeId);
  }

  await ctx.answerCbQuery();

  // Refresh the menu
  await showFilterMenuEdit(ctx);
}

/**
 * Select all types.
 */
export async function handleFilterAll(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const allTypes = await prisma.channelType.findMany();
  const typeIds = new Set(allTypes.map((t) => t.id));
  typeIds.add(0);
  userFilters.set(userId, typeIds);

  await ctx.answerCbQuery("Все типы выбраны");
  await showFilterMenuEdit(ctx);
}

/**
 * Clear all types.
 */
export async function handleFilterNone(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  userFilters.set(userId, new Set());

  await ctx.answerCbQuery("Фильтр очищен");
  await showFilterMenuEdit(ctx);
}

/**
 * Edit existing message with updated filter menu.
 */
async function showFilterMenuEdit(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const types = await prisma.channelType.findMany({
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { channels: { where: { isActive: true } } } },
    },
  });

  const noTypeCount = await prisma.channel.count({
    where: { isActive: true, typeId: null },
  });

  const currentFilter = userFilters.get(userId) || new Set();

  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

  for (const type of types) {
    if (type._count.channels === 0) continue;

    const isSelected = currentFilter.has(type.id);
    const mark = isSelected ? "✓ " : "○ ";
    const label = `${mark}${type.emoji} ${getTypeLabel(type.name)} (${type._count.channels})`;

    buttons.push([Markup.button.callback(label, `filter_toggle:${type.id}`)]);
  }

  if (noTypeCount > 0) {
    const isSelected = currentFilter.has(0);
    const mark = isSelected ? "✓ " : "○ ";
    buttons.push([
      Markup.button.callback(`${mark}📁 Без типа (${noTypeCount})`, "filter_toggle:0"),
    ]);
  }

  buttons.push([
    Markup.button.callback("✅ Выбрать все", "filter_all"),
    Markup.button.callback("❌ Очистить", "filter_none"),
  ]);

  buttons.push([
    Markup.button.callback("📰 Применить и создать дайджест", "filter_apply"),
  ]);

  buttons.push([Markup.button.callback("🏠 Меню", "back_to_menu")]);

  const selectedCount = currentFilter.size;
  const totalTypes = types.filter((t) => t._count.channels > 0).length + (noTypeCount > 0 ? 1 : 0);

  await ctx.editMessageText(
    `<b>🎯 Фильтр каналов</b>\n\n` +
      `Выбрано типов: ${selectedCount}/${totalTypes}\n` +
      `Отмеченные (✓) будут включены в дайджест.`,
    { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
  );
}

/**
 * Get channel IDs matching current filter.
 */
export async function getFilteredChannelIds(userId: number): Promise<number[] | null> {
  const filter = userFilters.get(userId);

  if (!filter || filter.size === 0) {
    return null; // No filter or empty = show nothing
  }

  // Check if filter includes all types (essentially no filter)
  const allTypes = await prisma.channelType.findMany();
  const noTypeCount = await prisma.channel.count({ where: { isActive: true, typeId: null } });

  const totalTypesWithChannels = allTypes.length + (noTypeCount > 0 ? 1 : 0);

  if (filter.size >= totalTypesWithChannels) {
    return null; // All selected = no filter needed
  }

  // Build list of channel IDs
  const typeIds = Array.from(filter).filter((id) => id !== 0);
  const includeNoType = filter.has(0);

  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
      OR: [
        { typeId: { in: typeIds.length > 0 ? typeIds : [-1] } },
        ...(includeNoType ? [{ typeId: null }] : []),
      ],
    },
    select: { id: true },
  });

  return channels.map((c) => c.id);
}
