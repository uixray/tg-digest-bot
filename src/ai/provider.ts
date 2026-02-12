import { config } from "../config";
import { YandexGPTProvider } from "./yandexgpt";
import { LMStudioProvider } from "./lmstudio";

export interface AIProvider {
  summarize(texts: string[]): Promise<string>;
}

export function getAIProvider(): AIProvider | null {
  switch (config.aiProvider) {
    case "yandexgpt":
      return new YandexGPTProvider();
    case "lmstudio":
      return new LMStudioProvider();
    case "none":
    default:
      return null;
  }
}
