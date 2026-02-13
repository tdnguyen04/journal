import { sendMessage, answerCallback } from '../bot-api';
import { handleGapCallback, handleTagCallback } from './callback-actions';

const ERROR_MSG = 'Hmm, something went wrong. Try again in a moment?';

/**
 * Main callback handler - routes to appropriate handler based on callback data
 */
export async function handleCallback(query: any) {
  const chatId = query.message.chat.id.toString();
  const data = query.data; // Format: "gap:LOGID:ACTION" or "tag:LOGID:VALUE"
  const messageId = query.message.message_id;
  const originalText = query.message.text;

  // Ack the click immediately
  await answerCallback(query.id);

  const parts = data.split(':');
  if (parts.length !== 3) {
    console.error(`[Telegram] Invalid callback data format: ${data}`);
    return;
  }

  const [type, logId, value] = parts;

  try {
    if (type === 'gap') {
      await handleGapCallback(chatId, logId, value, messageId, originalText);
    } else if (type === 'tag') {
      await handleTagCallback(chatId, logId, value, messageId, originalText, query.message.reply_markup);
    } else {
      console.error(`[Telegram] Unknown callback type: ${type}`);
    }
  } catch (error) {
    console.error(`[Telegram] Error handling ${type} callback:`, error);
    await sendMessage(chatId, ERROR_MSG);
  }
}
