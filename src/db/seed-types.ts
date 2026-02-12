import { prisma } from "./prisma";

/**
 * Built-in channel types with their emoji indicators.
 */
const BUILTIN_TYPES = [
  { name: "personal", emoji: "👤" },      // Личный канал
  { name: "company", emoji: "🏢" },       // Канал компании
  { name: "digest", emoji: "📰" },        // Дайджесты
  { name: "news", emoji: "📢" },          // Новостные
  { name: "tech", emoji: "💻" },          // Технологии
  { name: "other", emoji: "📁" },         // Другое
];

/**
 * Ensure all built-in channel types exist in the database.
 * Called at startup.
 */
export async function seedChannelTypes(): Promise<void> {
  for (const type of BUILTIN_TYPES) {
    await prisma.channelType.upsert({
      where: { name: type.name },
      update: { emoji: type.emoji, isBuiltin: true },
      create: { name: type.name, emoji: type.emoji, isBuiltin: true },
    });
  }
  console.log("[Seed] Channel types initialized");
}

/**
 * Get all channel types (built-in + custom).
 */
export async function getAllChannelTypes() {
  return prisma.channelType.findMany({
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
  });
}

/**
 * Get a channel type by name.
 */
export async function getChannelTypeByName(name: string) {
  return prisma.channelType.findUnique({ where: { name } });
}

/**
 * Create a custom channel type.
 */
export async function createCustomType(name: string, emoji: string = "📁") {
  return prisma.channelType.create({
    data: { name, emoji, isBuiltin: false },
  });
}

/**
 * Delete a custom channel type (cannot delete built-in).
 */
export async function deleteCustomType(name: string): Promise<boolean> {
  const type = await prisma.channelType.findUnique({ where: { name } });
  if (!type || type.isBuiltin) {
    return false;
  }

  // Reset channels with this type to null
  await prisma.channel.updateMany({
    where: { typeId: type.id },
    data: { typeId: null },
  });

  await prisma.channelType.delete({ where: { name } });
  return true;
}

/**
 * Mapping of type names to Russian labels.
 */
export const TYPE_LABELS: Record<string, string> = {
  personal: "Личный",
  company: "Компания",
  digest: "Дайджест",
  news: "Новости",
  tech: "Технологии",
  other: "Другое",
};

/**
 * Get display label for a type (Russian name or original for custom).
 */
export function getTypeLabel(name: string): string {
  return TYPE_LABELS[name] || name;
}
