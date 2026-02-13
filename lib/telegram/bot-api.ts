// lib/telegram/bot-api.ts
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BASE = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

type TelegramResponse = { ok: true; result?: unknown } | { ok: false; description?: string };

/** Telegram sendMessage (and similar) returns a Message object; we use message_id to track for edit/delete */
export type TelegramMessageResult = { message_id: number };

/**
 * Single wrapper for Telegram Bot API calls with retry on network errors (e.g. ECONNRESET).
 * - Retries up to RETRY_ATTEMPTS on throw (network failure).
 * - Does not retry when Telegram returns ok: false (e.g. 400 Bad Request).
 * - Returns parsed response or null on failure.
 */
async function telegramApi(
  method: string,
  body: Record<string, unknown>,
  logLabel?: string
): Promise<TelegramResponse | null> {
  const label = logLabel ?? method;
  const url = `${TELEGRAM_BASE}/${method}`;

  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Connection: 'close' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as TelegramResponse;

      if (!data.ok) {
        console.error(`❌ Telegram API [${label}]:`, (data as { description?: string }).description);
        return null;
      }
      return data; // Success — return immediately, no extra attempts
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`⚠️ Network [${label}] (attempt ${i + 1}/${RETRY_ATTEMPTS}):`, msg);
      if (i === RETRY_ATTEMPTS - 1) return null;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return null;
}

export async function sendMessage(
  chatId: string,
  text: string,
  keyboard?: unknown,
) {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (keyboard) body.reply_markup = keyboard;
  return telegramApi('sendMessage', body, 'sendMessage');
}

export async function editMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: unknown,
): Promise<TelegramResponse | null> {
  return telegramApi(
    'editMessageText',
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: keyboard ?? undefined,
    },
    'editMessageText'
  );
}

export async function deleteMessage(chatId: string, messageId: number) {
  return telegramApi(
    'deleteMessage',
    { chat_id: chatId, message_id: messageId },
    'deleteMessage'
  );
}

export async function answerCallback(callbackId: string) {
  return telegramApi(
    'answerCallbackQuery',
    { callback_query_id: callbackId },
    'answerCallbackQuery'
  );
}

export async function sendTypingAction(chatId: string) {
  return telegramApi(
    'sendChatAction',
    { chat_id: chatId, action: 'typing' },
    'sendChatAction'
  );
}
