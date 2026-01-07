// lib/telegram/handlers.ts
import prisma from '@/lib/prisma/prisma';
import { sendMessage, editMessage, answerCallback } from './client';

// --- BUTTON CLICKS (Tagging) ---
export async function handleCallback(query: any) {
  const chatId = query.message.chat.id.toString();
  const data = query.data; // "tag:LOGID:VALUE"

  // Ack the click immediately
  await answerCallback(query.id);

  const parts = data.split(':');
  if (parts.length === 3 && parts[0] === 'tag') {
    const [_, logId, valueToAdd] = parts;

    try {
      const currentLog = await prisma.log.findUnique({ where: { id: logId } });

      if (currentLog) {
        const currentTags = currentLog.tagValues || [];
        const updatedTags = currentTags.includes(valueToAdd)
          ? currentTags
          : [...currentTags, valueToAdd];

        await prisma.log.update({
          where: { id: logId },
          data: { tagValues: updatedTags },
        });

        // Update UI to show the tag was added
        const originalText = query.message.text;
        if (!originalText.includes(`#${valueToAdd}`)) {
          await editMessage(
            chatId,
            query.message.message_id,
            `${originalText} #${valueToAdd}`,
            query.message.reply_markup,
          );
        }
      }
    } catch (e) {
      console.error('Database Error during tagging:', e);
      await sendMessage(chatId, '⚠️ Database Error: Could not save that tag.');
    }
  }
}

// --- AUTH & COMMANDS ---
export async function handleLogout(chatId: string) {
  try {
    const user = await prisma.userPreferences.findUnique({ where: { telegramChatId: chatId } });
    if (user) {
      await prisma.userPreferences.update({
        where: { id: user.id },
        data: { telegramChatId: null },
      });
      await sendMessage(chatId, '🔌 Disconnected. Connect again via website.');
    } else {
      await sendMessage(chatId, 'You are not connected.');
    }
  } catch (e) {
    console.error('Logout DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error.');
  }
}

export async function handleStart(chatId: string, text: string, existingUser: any) {
  const token = text.split(' ')[1];
  
  if (!token) {
    const msg = existingUser
      ? `Welcome back, ${existingUser.userName}! Just type your log.`
      : 'Hi! To connect, go to your App Settings and send me the code.';
    await sendMessage(chatId, msg);
    return;
  }

  try {
    const pendingUser = await prisma.userPreferences.findFirst({ where: { connectToken: token } });

    if (!pendingUser) {
      if (existingUser) await sendMessage(chatId, 'You are already connected!');
      else await sendMessage(chatId, 'Invalid or expired code.');
      return;
    }

    await prisma.userPreferences.update({
      where: { id: pendingUser.id },
      data: { telegramChatId: chatId, connectToken: null },
    });

    await sendMessage(chatId, '✅ Account connected! You can now type logs directly.');
  } catch (e) {
    console.error('Start DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error.');
  }
}

// --- LOGGING (The Core) ---
export async function handleLogEntry(chatId: string, text: string, user: any) {
  const displayName = user.userName || 'Friend';

  // Redaction Logic
  let finalNote = text;
  let isRedacted = false;
  if (text.toLowerCase().startsWith('/redacted') || text.toLowerCase().startsWith('/secret')) {
    isRedacted = true;
    finalNote = text.replace(/^\/(redacted|secret)[:\s]*/i, '').trim();
  }

  // 1. Create Log
  let newLog;
  try {
    newLog = await prisma.log.create({
      data: {
        userId: user.userId,
        content: { note: finalNote, timestamp: new Date().toISOString() },
        isRedacted: isRedacted,
        tagValues: [],
      },
    });
  } catch (dbError) {
    console.error('Database Save Error:', dbError);
    await sendMessage(chatId, '⚠️ Database Error: Could not save log.');
    return;
  }

  // 2. Prepare Tags (Inline Buttons)
  const userTags = user.customValues && user.customValues.length > 0
      ? user.customValues
      : ['Health', 'Work', 'Connection', 'Growth'];

  const inlineKeyboard = { inline_keyboard: [] as any[] };
  let row: any[] = [];
  userTags.forEach((tag: string) => {
    row.push({ text: tag, callback_data: `tag:${newLog.id}:${tag}` });
    if (row.length === 2) {
      inlineKeyboard.inline_keyboard.push(row);
      row = [];
    }
  });
  if (row.length > 0) inlineKeyboard.inline_keyboard.push(row);

  const prefix = isRedacted ? '🔒 Log saved (Hidden)' : '📝 Saved';
  await sendMessage(chatId, `${prefix}, ${displayName}! Pick a value:`, inlineKeyboard);
}