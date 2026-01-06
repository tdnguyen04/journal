import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { createLog } from '@/app/(protected)/home/actions'; // Reuse your existing log logic!

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper to send messages back to Telegram
async function sendMessage(chatId: string, text: string, keyboard?: any) {
  const body: any = { chat_id: chatId, text };
  if (keyboard) {
    body.reply_markup = keyboard;
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function editMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: any,
) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      reply_markup: keyboard,
    }),
  });
}

// --- 2. HANDLERS ---

async function handleCallback(query: any) {
  const chatId = query.message.chat.id.toString();
  const data = query.data; // "tag:LOGID:VALUE"

  // Ack the click
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    },
  );

  const parts = data.split(':');
  if (parts.length === 3 && parts[0] === 'tag') {
    const [_, logId, valueToAdd] = parts;

    try {
      const currentLog = await prisma.log.findUnique({ where: { id: logId } });
      if (currentLog) {
        // Add tag uniquely
        const currentTags = currentLog.tagValues || [];
        const updatedTags = currentTags.includes(valueToAdd)
          ? currentTags
          : [...currentTags, valueToAdd];

        await prisma.log.update({
          where: { id: logId },
          data: { tagValues: updatedTags },
        });

        // Update UI
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
      console.error('Tagging error:', e);
    }
  }
}

async function handleLogout(chatId: string) {
  const user = await prisma.userPreferences.findUnique({
    where: { telegramChatId: chatId },
  });
  if (user) {
    await prisma.userPreferences.update({
      where: { id: user.id },
      data: { telegramChatId: null },
    });
    await sendMessage(
      chatId,
      '🔌 Disconnected. You can connect a new account via the website.',
    );
  } else {
    await sendMessage(chatId, 'You are not connected.');
  }
}

async function handleStart(chatId: string, text: string, existingUser: any) {
  const token = text.split(' ')[1];
  if (!token) {
    const msg = existingUser
      ? `Welcome back, ${existingUser.userName}! Just type your log.`
      : 'Hi! To connect, go to your App Settings and send me the code.';
    await sendMessage(chatId, msg);
    return;
  }

  const pendingUser = await prisma.userPreferences.findFirst({
    where: { connectToken: token },
  });
  if (!pendingUser) {
    if (existingUser) {
       await sendMessage(chatId, "You are already connected! Just start typing.");
    } else {
       await sendMessage(chatId, 'Invalid or expired code.');
    }
    return;
  }

  await prisma.userPreferences.update({
    where: { id: pendingUser.id },
    data: { telegramChatId: chatId, connectToken: null },
  });
  await sendMessage(
    chatId,
    '✅ Account connected! You can now type logs here directly.',
  );
}

async function handleLogEntry(chatId: string, text: string, user: any) {
  const displayName = user.userName || 'Friend';

  // Redaction Logic
  let finalNote = text;
  let isRedacted = false;
  if (
    text.toLowerCase().startsWith('/redacted') ||
    text.toLowerCase().startsWith('/secret')
  ) {
    isRedacted = true;
    finalNote = text.replace(/^\/(redacted|secret)[:\s]*/i, '').trim();
  }

  try {
    const newLog = await prisma.log.create({
      data: {
        userId: user.userId,
        content: { note: finalNote, timestamp: new Date().toISOString() },
        isRedacted: isRedacted,
        tagValues: [],
      },
    });

    // Prepare Buttons
    const userTags =
      user.customValues && user.customValues.length > 0
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

    // Send Reply
    const prefix = isRedacted ? '🔒 Log saved (Hidden)' : '📝 Saved';
    await sendMessage(
      chatId,
      `${prefix}, ${displayName}! Pick a value:`,
      inlineKeyboard,
    );
  } catch (e) {
    console.error('Save error:', e);
    await sendMessage(chatId, 'Error saving log.');
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  // ROUTE A: Button Click
  if (body.callback_query) {
    await handleCallback(body.callback_query);
    return NextResponse.json({ ok: true });
  }

  // Validation
  if (!body.message || !body.message.text) return NextResponse.json({ ok: true });
  
  const chatId = body.message.chat.id.toString();
  const text = body.message.text.trim();

  // ROUTE B: Commands
  if (text === '/logout') {
    await handleLogout(chatId);
    return NextResponse.json({ ok: true });
  }

  // Check Auth
  const existingUser = await prisma.userPreferences.findUnique({
    where: { telegramChatId: chatId },
  });

  // ROUTE C: Handshake
  if (text.startsWith('/start')) {
    await handleStart(chatId, text, existingUser);
    return NextResponse.json({ ok: true });
  }

  // ROUTE D: Logging
  if (existingUser) {
    await handleLogEntry(chatId, text, existingUser);
  } else {
    await sendMessage(chatId, "Please connect your account first via the website.");
  }

  return NextResponse.json({ ok: true });
}
