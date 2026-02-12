import OpenAI from "openai";
import { AIProvider } from "./provider";
import { config } from "../config";

const SYSTEM_PROMPT = `Ты — помощник для создания новостных сводок.
Тебе дают набор сообщений из разных Telegram-каналов.
Сделай краткую структурированную сводку на русском языке:
- Выдели основные темы и события
- Для каждой темы дай краткое описание (1-2 предложения)
- Если есть связанные новости из разных каналов — объедини их
- Не добавляй информацию, которой нет в исходных сообщениях
- Если к сообщению прикреплено медиа (фото, видео, аудио, документ), упомяни это в сводке — например: "...опубликовали видео с места событий" или "...пост сопровождается фотографией"
- Пометки вида [Прикреплено: фото/видео/...] обозначают тип медиа в оригинальном сообщении`;

const MAX_INPUT_CHARS = 15000;

export class LMStudioProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: config.lmstudioBaseUrl,
      apiKey: "not-needed",
    });
  }

  async summarize(texts: string[]): Promise<string> {
    let combined = texts.join("\n\n---\n\n");
    if (combined.length > MAX_INPUT_CHARS) {
      combined = combined.slice(0, MAX_INPUT_CHARS) + "\n\n[...сообщения обрезаны]";
    }

    const response = await this.client.chat.completions.create({
      model: "local-model",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: combined },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content;

    if (!result) {
      throw new Error("LM Studio: empty response");
    }

    return result;
  }
}
