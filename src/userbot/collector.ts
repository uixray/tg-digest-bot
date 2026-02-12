import { Api } from "telegram";
import { getUserbot } from "./client";
import { prisma } from "../db/prisma";

const COLLECT_LIMIT = 50;
const DELAY_BETWEEN_CHANNELS_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMediaType(message: Api.Message): string | null {
  if (!message.media) return null;
  if (message.media instanceof Api.MessageMediaPhoto) return "photo";
  if (message.media instanceof Api.MessageMediaDocument) {
    const doc = message.media.document;
    if (doc instanceof Api.Document) {
      const isVideo = doc.mimeType?.startsWith("video/");
      if (isVideo) return "video";
      return "document";
    }
    return "document";
  }
  if (message.media instanceof Api.MessageMediaWebPage) return "webpage";
  return "other";
}

function buildMessageUrl(username: string | null, messageId: number): string | null {
  if (!username) return null;
  return `https://t.me/${username}/${messageId}`;
}

/**
 * Collect recent messages from a single channel.
 */
export async function collectFromChannel(
  channelTelegramId: bigint,
  channelDbId: number,
  channelUsername: string | null,
  since?: Date
): Promise<number> {
  const client = await getUserbot();

  const entity = await client.getEntity(channelTelegramId.toString());

  const params: any = { limit: COLLECT_LIMIT };
  if (since) {
    params.offsetDate = Math.floor(since.getTime() / 1000);
  }

  const messages = await client.getMessages(entity, params);
  let savedCount = 0;

  for (const msg of messages) {
    if (!(msg instanceof Api.Message)) continue;
    if (!msg.message && !msg.media) continue;

    const text = msg.message || null;
    const mediaType = getMediaType(msg);
    const url = buildMessageUrl(channelUsername, msg.id);
    const date = new Date(msg.date * 1000);

    try {
      await prisma.message.upsert({
        where: {
          channelId_telegramId: {
            channelId: channelDbId,
            telegramId: msg.id,
          },
        },
        update: {},
        create: {
          telegramId: msg.id,
          channelId: channelDbId,
          text,
          mediaType,
          url,
          date,
        },
      });
      savedCount++;
    } catch (err: any) {
      // Skip duplicate constraint violations silently
      if (err.code !== "P2002") {
        console.error(`[Collector] Error saving message ${msg.id}:`, err.message);
      }
    }
  }

  return savedCount;
}

/**
 * Collect messages from all active channels.
 */
export async function collectAll(since?: Date): Promise<{ total: number; channels: number }> {
  const channels = await prisma.channel.findMany({
    where: { isActive: true },
  });

  let total = 0;
  let processedChannels = 0;

  for (const channel of channels) {
    try {
      console.log(`[Collector] Collecting from "${channel.title}"...`);
      const count = await collectFromChannel(
        channel.telegramId,
        channel.id,
        channel.username,
        since
      );
      total += count;
      processedChannels++;
      console.log(`[Collector] "${channel.title}": ${count} messages`);
    } catch (err: any) {
      console.error(`[Collector] Error collecting from "${channel.title}":`, err.message);
    }

    // Rate limiting between channels
    if (channels.indexOf(channel) < channels.length - 1) {
      await sleep(DELAY_BETWEEN_CHANNELS_MS);
    }
  }

  return { total, channels: processedChannels };
}
