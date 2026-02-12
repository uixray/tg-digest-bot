import { Context, MiddlewareFn } from "telegraf";
import { config } from "../../config";

/**
 * Middleware that restricts bot access to the owner only.
 */
export const ownerOnly: MiddlewareFn<Context> = (ctx, next) => {
  if (ctx.from?.id !== config.ownerChatId) {
    return; // Silently ignore non-owner messages
  }
  return next();
};
