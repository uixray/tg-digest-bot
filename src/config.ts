import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

export const config = {
  // Telegram Bot
  botToken: required("BOT_TOKEN"),
  ownerChatId: Number(required("OWNER_CHAT_ID")),

  // GramJS Userbot
  telegramApiId: Number(required("TELEGRAM_API_ID")),
  telegramApiHash: required("TELEGRAM_API_HASH"),
  telegramSession: optional("TELEGRAM_SESSION"),

  // PostgreSQL (handled by Prisma via DATABASE_URL)

  // AI
  aiProvider: optional("AI_PROVIDER", "none") as
    | "yandexgpt"
    | "lmstudio"
    | "none",
  yandexFolderId: optional("YANDEX_FOLDER_ID"),
  yandexApiKey: optional("YANDEX_API_KEY"),
  lmstudioBaseUrl: optional("LMSTUDIO_BASE_URL", "http://localhost:1234/v1"),

  // Scheduler
  digestCron: optional("DIGEST_CRON", "0 9 * * *"),
  digestTimezone: optional("DIGEST_TIMEZONE", "Europe/Moscow"),

  // Obsidian Export via GitHub API (v1.2)
  githubToken: optional("GITHUB_TOKEN"),
  githubRepo: optional("GITHUB_REPO"),          // "owner/repo"
  githubBranch: optional("GITHUB_BRANCH", "master"),
  obsidianDigestsPath: optional("OBSIDIAN_DIGESTS_PATH", "09-knowledge/digests"),
};
