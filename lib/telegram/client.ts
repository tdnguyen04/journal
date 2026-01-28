// lib/telegram/client.ts
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendMessage(
  chatId: string,
  text: string,
  keyboard?: any,
) {
  const body: any = { chat_id: chatId, text };
  if (keyboard) {
    body.reply_markup = keyboard;
  }

  // ✅ ADDED: Retry logic (3 attempts) to fix ECONNRESET
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Connection: 'close' },
          body: JSON.stringify(body),
          // conn reset fixes: sometimes helps to explicitly set keepalive false in node,
          // but retry is the most robust fix for fetch.
        },
      );

      const data = await res.json();

      if (!data.ok) {
        console.error(`❌ Telegram API Error:`, data.description);
        return null; // Don't retry if Telegram explicitly rejected it (e.g. 400 Bad Request)
      }

      return data; // Success
    } catch (error: any) {
      console.error(`⚠️ Network Error (Attempt ${i + 1}/3):`, error.message);

      if (i === 2) return null; // Fail silently after 3 tries
      await new Promise((r) => setTimeout(r, 500)); // Wait 500ms before retrying
    }
  }
}

export async function editMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: any,
) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          reply_markup: keyboard,
        }),
      },
    );
  } catch (error) {
    console.error('Telegram editMessage failed:', error);
  }
}

// Delete a bot message (used to clean up force_reply prompts after handling)
export async function deleteMessage(chatId: string, messageId: number) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      },
    );
  } catch (error) {
    console.error('Telegram deleteMessage failed:', error);
  }
}

export async function answerCallback(callbackId: string) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId }),
      },
    );
  } catch (e) {
    console.error('Ack failed', e);
  }
}

export async function sendTypingAction(chatId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
  } catch (e) {
    console.error('Typing Action Failed', e);
  }
}
