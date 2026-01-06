import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// --- 1. SAFE HELPERS (Never throw to user, only log) ---

async function sendMessage(chatId: string, text: string, keyboard?: any) {
  try {
    const body: any = { chat_id: chatId, text };
    if (keyboard) {
      body.reply_markup = keyboard;
    }
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // SILENT FAILURE: We do not message the user if Telegram itself fails
    console.error('Telegram sendMessage failed:', error);
  }
}

async function editMessage(
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
    // SILENT FAILURE: We do not message the user if editing fails
    console.error('Telegram editMessage failed:', error);
  }
}

// --- 2. HANDLERS ---

async function handleCallback(query: any) {
  const chatId = query.message.chat.id.toString();
  const data = query.data; // "tag:LOGID:VALUE"

  // Ack the click (Fire and forget)
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id }),
  }).catch((e) => console.error('Ack failed', e));

  const parts = data.split(':');
  if (parts.length === 3 && parts[0] === 'tag') {
    const [_, logId, valueToAdd] = parts;

    try {
      // 1. DATABASE LOOKUP
      const currentLog = await prisma.log.findUnique({ where: { id: logId } });

      if (currentLog) {
        // Add tag uniquely
        const currentTags = currentLog.tagValues || [];
        const updatedTags = currentTags.includes(valueToAdd)
          ? currentTags
          : [...currentTags, valueToAdd];

        // 2. DATABASE WRITE
        await prisma.log.update({
          where: { id: logId },
          data: { tagValues: updatedTags },
        });

        // 3. UI UPDATE (Only happens if DB succeeds)
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
      // OPTIONAL: Notify user only if it was a DB error
      await sendMessage(chatId, '⚠️ Database Error: Could not save that tag.');
    }
  }
}

async function handleLogout(chatId: string) {
  try {
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
  } catch (e) {
    console.error('Logout DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error: Could not disconnect.');
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

  try {
    const pendingUser = await prisma.userPreferences.findFirst({
      where: { connectToken: token },
    });

    if (!pendingUser) {
      if (existingUser) {
        await sendMessage(
          chatId,
          'You are already connected! Just start typing.',
        );
      } else {
        await sendMessage(chatId, 'Invalid or expired code.');
      }
      return;
    }

    // DATABASE WRITE
    await prisma.userPreferences.update({
      where: { id: pendingUser.id },
      data: { telegramChatId: chatId, connectToken: null },
    });

    await sendMessage(
      chatId,
      '✅ Account connected! You can now type logs here directly.',
    );
  } catch (e) {
    console.error('Start DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error: Could not connect account.');
  }
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

  // --- STEP 1: DATABASE OPERATION ---
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
    // THIS IS THE ONLY TIME WE ERROR TO THE USER
    await sendMessage(chatId, '⚠️ Database Error: Could not save log.');
    return; // Stop execution
  }

  // --- STEP 2: TELEGRAM UI OPERATION ---
  // If the code below fails (e.g. Telegram is down), the log IS SAVED,
  // and we do NOT spam the user with "Error sending message".

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

  const prefix = isRedacted ? '🔒 Log saved (Hidden)' : '📝 Saved';

  // This uses the "Safe" sendMessage which swallows its own errors
  await sendMessage(
    chatId,
    `${prefix}, ${displayName}! Pick a value:`,
    inlineKeyboard,
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ROUTE A: Button Click
    if (body.callback_query) {
      await handleCallback(body.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Validation
    if (!body.message || !body.message.text)
      return NextResponse.json({ ok: true });

    const chatId = body.message.chat.id.toString();
    const text = body.message.text.trim();

    // ROUTE B: Commands
    if (text === '/logout') {
      await handleLogout(chatId);
      return NextResponse.json({ ok: true });
    }

    // Check Auth
    // We wrap this in try/catch implicitly via the next steps,
    // but looking up the user is a DB read. If this fails, we probably shouldn't reply at all.
    let existingUser = null;
    try {
      existingUser = await prisma.userPreferences.findUnique({
        where: { telegramChatId: chatId },
      });
    } catch (e) {
      console.error('Auth DB Error', e);
      // We stop here if we can't check auth. No message sent.
      return NextResponse.json({ ok: true });
    }

    // ROUTE C: Handshake
    if (text.startsWith('/start')) {
      await handleStart(chatId, text, existingUser);
      return NextResponse.json({ ok: true });
    }

    // ROUTE D: Logging
    if (existingUser) {
      await handleLogEntry(chatId, text, existingUser);
    } else {
      await sendMessage(
        chatId,
        'Please connect your account first via the website.',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('General Webhook Error:', error);
    // Return 200 OK so Telegram stops retrying a broken request
    return NextResponse.json({ ok: true });
  }
}
