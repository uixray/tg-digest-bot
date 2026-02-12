/**
 * Standalone script for first-time GramJS authentication.
 * Run: npm run auth
 *
 * After successful login, the session string is printed to console.
 * Copy it into your .env file as TELEGRAM_SESSION=...
 */
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";
import dotenv from "dotenv";
dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH!;

(async () => {
  console.log("=== Telegram Userbot Authorization ===\n");

  const session = new StringSession("");
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Phone number (with country code): "),
    password: async () => await input.text("2FA password (if enabled): "),
    phoneCode: async () => await input.text("Code from Telegram: "),
    onError: (err) => console.error("Auth error:", err),
  });

  console.log("\n=== Authorization successful! ===");
  console.log("\nYour session string (add to .env as TELEGRAM_SESSION):\n");
  console.log(client.session.save());
  console.log("");

  await client.disconnect();
  process.exit(0);
})();
