import { config } from "./config";
import { prisma } from "./db/prisma";
import { seedChannelTypes } from "./db/seed-types";
import { getUserbot, disconnectUserbot } from "./userbot/client";
import { createBot } from "./bot";
import { startScheduler, stopScheduler } from "./scheduler/cron";

async function main() {
  console.log("=== Telegram Digest Bot ===\n");

  // 1. Connect to database
  await prisma.$connect();
  console.log("[DB] Connected to PostgreSQL");

  // 1.1. Seed default channel types
  await seedChannelTypes();

  // 2. Connect GramJS userbot
  if (!config.telegramSession) {
    console.error(
      "[Userbot] No session found. Run `npm run auth` first to authenticate."
    );
    process.exit(1);
  }

  const userbotClient = await getUserbot();
  console.log("[Userbot] Ready");

  // 3. Start Telegraf bot
  const bot = createBot();

  // Register commands menu in Telegram UI
  await bot.telegram.setMyCommands([
    { command: "menu", description: "📰 Главное меню" },
    { command: "digest", description: "Сформировать дайджест" },
    { command: "channels", description: "Список каналов" },
    { command: "add", description: "Добавить канал" },
    { command: "remove", description: "Убрать канал" },
    { command: "types", description: "Типы каналов" },
    { command: "collect", description: "Собрать сообщения" },
    { command: "settings", description: "Настройки" },
    { command: "help", description: "Справка" },
  ]);

  await bot.launch();
  console.log("[Bot] Started");

  // 4. Start cron scheduler
  await startScheduler(bot);

  console.log("\nBot is running. Press Ctrl+C to stop.\n");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down...`);
    stopScheduler();
    bot.stop(signal);
    await disconnectUserbot();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
