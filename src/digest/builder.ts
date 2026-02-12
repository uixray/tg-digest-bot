import { prisma } from "../db/prisma";
import { getAIProvider } from "../ai/provider";

function mediaLabel(type: string): string {
  switch (type) {
    case "photo": return "фото";
    case "video": return "видео";
    case "document": return "документ";
    case "webpage": return "ссылка/превью";
    case "audio": return "аудио";
    case "voice": return "голосовое сообщение";
    case "sticker": return "стикер";
    default: return "медиа";
  }
}

export interface DigestChannelGroup {
  title: string;
  username: string | null;
  messages: {
    text: string | null;
    mediaType: string | null;
    url: string | null;
    date: Date;
  }[];
}

export interface DigestData {
  periodStart: Date;
  periodEnd: Date;
  channels: DigestChannelGroup[];
  aiSummary: string | null;
  messageIds: number[];
}

/**
 * Build a digest for the given period.
 * If `since` is not provided, defaults to 24h ago.
 * If `channelIds` is provided, only include messages from those channels.
 */
export async function buildDigest(
  since?: Date,
  withAI: boolean = false,
  channelIds?: number[] | null
): Promise<DigestData | null> {
  const periodEnd = new Date();

  // Determine period start — always default to 24h ago
  const periodStart = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Build channel filter
  const channelFilter: any = { isActive: true };
  if (channelIds && channelIds.length > 0) {
    channelFilter.id = { in: channelIds };
  }

  // Fetch messages grouped by channel
  const messages = await prisma.message.findMany({
    where: {
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      channel: channelFilter,
    },
    include: { channel: true },
    orderBy: { date: "asc" },
  });

  if (messages.length === 0) {
    return null;
  }

  // Group by channel
  const groupMap = new Map<number, DigestChannelGroup>();
  const messageIds: number[] = [];

  for (const msg of messages) {
    messageIds.push(msg.id);

    if (!groupMap.has(msg.channelId)) {
      groupMap.set(msg.channelId, {
        title: msg.channel.title,
        username: msg.channel.username,
        messages: [],
      });
    }

    groupMap.get(msg.channelId)!.messages.push({
      text: msg.text,
      mediaType: msg.mediaType,
      url: msg.url,
      date: msg.date,
    });
  }

  const channels = Array.from(groupMap.values());

  // AI summarization (optional)
  let aiSummary: string | null = null;
  if (withAI) {
    try {
      const provider = getAIProvider();
      if (provider) {
        const texts = messages
          .filter((m) => m.text || m.mediaType)
          .map((m) => {
            const parts: string[] = [`[${m.channel.title}]`];
            if (m.text) parts.push(m.text);
            if (m.mediaType) parts.push(`[Прикреплено: ${mediaLabel(m.mediaType)}]`);
            return parts.join(" ");
          });

        if (texts.length > 0) {
          aiSummary = await provider.summarize(texts);
        }
      }
    } catch (err: any) {
      console.error("[Digest] AI summarization failed:", err.message);
      aiSummary = `[AI-суммаризация недоступна: ${err.message}]`;
    }
  }

  // Save digest to DB
  const digest = await prisma.digest.create({
    data: {
      content: "", // Will be filled by formatter when sending
      aiSummary,
      periodStart,
      periodEnd,
      messages: {
        create: messageIds.map((id) => ({ messageId: id })),
      },
    },
  });

  return { periodStart, periodEnd, channels, aiSummary, messageIds };
}
