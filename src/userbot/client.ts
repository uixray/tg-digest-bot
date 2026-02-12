import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { config } from "../config";

let client: TelegramClient | null = null;

export async function getUserbot(): Promise<TelegramClient> {
  if (client && client.connected) {
    return client;
  }

  const session = new StringSession(config.telegramSession);
  client = new TelegramClient(session, config.telegramApiId, config.telegramApiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("[Userbot] Connected to Telegram");

  return client;
}

export async function disconnectUserbot(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
    console.log("[Userbot] Disconnected");
  }
}
