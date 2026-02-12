import { AIProvider } from "./provider";
import { config } from "../config";

const YANDEX_API_URL =
  "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

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

export class YandexGPTProvider implements AIProvider {
  async summarize(texts: string[]): Promise<string> {
    if (!config.yandexFolderId || !config.yandexApiKey) {
      throw new Error("YandexGPT: YANDEX_FOLDER_ID and YANDEX_API_KEY are required");
    }

    // Concatenate and trim to fit token limits
    let combined = texts.join("\n\n---\n\n");
    if (combined.length > MAX_INPUT_CHARS) {
      combined = combined.slice(0, MAX_INPUT_CHARS) + "\n\n[...сообщения обрезаны]";
    }

    const body = {
      modelUri: `gpt://${config.yandexFolderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.3,
        maxTokens: "2000",
      },
      messages: [
        { role: "system", text: SYSTEM_PROMPT },
        { role: "user", text: combined },
      ],
    };

    const response = await fetch(YANDEX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${config.yandexApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YandexGPT API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const result = data.result?.alternatives?.[0]?.message?.text;

    if (!result) {
      throw new Error("YandexGPT: empty response");
    }

    return result;
  }
}
