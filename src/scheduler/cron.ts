import * as cron from "node-cron";
import { Telegraf } from "telegraf";
import { config } from "../config";
import { prisma } from "../db/prisma";
import { collectAll } from "../userbot/collector";
import { buildDigest } from "../digest/builder";
import { formatDigest, splitMessage } from "../digest/formatter";

let task: ReturnType<typeof cron.schedule> | null = null;

/**
 * Get effective cron expression (from DB override or config).
 */
async function getCronExpression(): Promise<string> {
  const setting = await prisma.settings.findUnique({
    where: { key: "digest_cron" },
  });
  return setting?.value || config.digestCron;
}

/**
 * Get effective AI provider setting.
 */
async function getAIProviderSetting(): Promise<string> {
  const setting = await prisma.settings.findUnique({
    where: { key: "ai_provider" },
  });
  return setting?.value || config.aiProvider;
}

/**
 * Execute the scheduled digest: collect → build → format → send.
 */
async function executeDigest(bot: Telegraf): Promise<void> {
  console.log("[Cron] Starting scheduled digest...");

  try {
    // Collect
    const collectResult = await collectAll();
    console.log(`[Cron] Collected ${collectResult.total} messages from ${collectResult.channels} channels`);

    // Build
    const aiProvider = await getAIProviderSetting();
    const digest = await buildDigest(undefined, aiProvider !== "none");

    if (!digest) {
      console.log("[Cron] No new messages — skipping digest");
      return;
    }

    // Format and send
    const html = formatDigest(digest);
    const parts = splitMessage(html);

    for (const part of parts) {
      await bot.telegram.sendMessage(config.ownerChatId, part, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }

    console.log("[Cron] Digest sent successfully");
  } catch (err: any) {
    console.error("[Cron] Error:", err.message);

    // Notify owner about the error
    try {
      await bot.telegram.sendMessage(
        config.ownerChatId,
        `Ошибка автоматического дайджеста: ${err.message}`
      );
    } catch {}
  }
}

/**
 * Start the cron scheduler.
 */
export async function startScheduler(bot: Telegraf): Promise<void> {
  const cronExpr = await getCronExpression();

  if (!cron.validate(cronExpr)) {
    console.error(`[Cron] Invalid cron expression: "${cronExpr}"`);
    return;
  }

  task = cron.schedule(
    cronExpr,
    () => {
      executeDigest(bot);
    },
    { timezone: config.digestTimezone }
  );

  console.log(`[Cron] Scheduled digest: "${cronExpr}" (${config.digestTimezone})`);
}

/**
 * Stop the cron scheduler.
 */
export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log("[Cron] Scheduler stopped");
  }
}
