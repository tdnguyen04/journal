import prisma from '@/lib/prisma/prisma';
import { sendMessage, sendTypingAction } from '../bot-api';
import { createNote } from '@/lib/helpers/log-operations';
import { generateNoteAck } from '../ai';

/**
 * Handle /logout command - disconnect Telegram chat from user account
 */
export async function handleLogout(chatId: string) {
  try {
    const user = await prisma.userPreferences.findUnique({
      where: { telegramChatId: chatId },
    });
    if (user) {
      await prisma.userPreferences.update({
        where: { id: user.id },
        data: { telegramChatId: null },
      });
      await sendMessage(chatId, '👋 Disconnected! Reconnect anytime from Settings.');
    } else {
      await sendMessage(chatId, "You're not connected to any account. Open the app → Settings → Connect Telegram to get started.");
    }
  } catch (e) {
    console.error('Logout DB Error', e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
  }
}

/**
 * Handle /start command - connection handshake or welcome message
 */
export async function handleStart(
  chatId: string,
  text: string,
  existingUser: any,
) {
  const token = text.split(' ')[1];

  if (!token) {
    const msg = existingUser
      ? `Hey ${existingUser.userName}! 👋 Ready to track. Just type what you did and I'll log it with timestamps.`
      : "Hi! I'm your journal bot 📓\n\nTo get started, open the app's Settings page and tap 'Connect Telegram' - I'll be ready to log your tasks!";
    await sendMessage(chatId, msg);
    return;
  }

  try {
    const pendingUser = await prisma.userPreferences.findFirst({
      where: { connectToken: token },
    });

    if (!pendingUser) {
      if (existingUser) await sendMessage(chatId, "You're already connected! Just type what you did to start logging.");
      else await sendMessage(chatId, "That code didn't work. Try generating a new one from Settings → Connect Telegram.");
      return;
    }

    await prisma.userPreferences.update({
      where: { id: pendingUser.id },
      data: { telegramChatId: chatId, connectToken: null },
    });

    await sendMessage(
      chatId,
      "✅ Connected! Just type what you're doing and I'll track it.\n\n" +
      "**Tips:**\n" +
      "• Regular text = Task with time tracking\n" +
      "• /note = Quick thought (no time)\n" +
      "• > text = Chain to last task\n" +
      "• /help = Show all commands",
    );
  } catch (e) {
    console.error('Start DB Error', e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
  }
}

/**
 * Handle /note command - create a note (no time tracking)
 */
export async function handleNote(chatId: string, text: string, user: any) {
  console.log(`[Telegram] 📝 New Note: "${text}"`);

  await sendTypingAction(chatId);

  try {
    await createNote({
      userId: user.userId,
      text: text,
      source: 'telegram',
    });

    // Generate personalized acknowledgment based on note content
    const ack = await generateNoteAck(text);
    await sendMessage(chatId, ack);
  } catch (e) {
    console.error(`[Telegram] 💥 Note DB Error:`, e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
  }
}
