import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { createLog } from '@/app/(protected)/home/actions'; // Reuse your existing log logic!

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Helper to send messages back to Telegram
async function sendMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  // 1. Validate the update
  if (!body.message || !body.message.text) {
    return NextResponse.json({ ok: true }); // Ignore non-text updates
  }

  const chatId = body.message.chat.id.toString();
  const text = body.message.text.trim();

  // 1. FIRST: Check for /logout (Before checking if user exists)
  if (text === '/logout') {
    // Only disconnect if they are actually connected
    const userToDisconnect = await prisma.userPreferences.findUnique({
      where: { telegramChatId: chatId },
    });

    if (userToDisconnect) {
      await prisma.userPreferences.update({
        where: { id: userToDisconnect.id },
        data: { telegramChatId: null },
      });
      await sendMessage(
        chatId,
        '🔌 Disconnected. You can connect a new account via the website.',
      );
    } else {
      await sendMessage(chatId, 'You are not connected.');
    }
    return NextResponse.json({ ok: true });
  }

  // 2. CHECK: Is this user already linked?
  const existingUser = await prisma.userPreferences.findUnique({
    where: { telegramChatId: chatId },
  });

  // SCENARIO A: The Handshake (User sends "/start 123456")
  if (text.startsWith('/start')) {
    const token = text.split(' ')[1]; // Extract the code

    if (!token) {
      if (existingUser) {
        await sendMessage(
          chatId,
          `Welcome back, ${existingUser.userName}! Just type your log.`,
        );
      } else {
        await sendMessage(
          chatId,
          'Hi! To connect, go to your App Settings and send me the code.',
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Verify the token
    const pendingUser = await prisma.userPreferences.findFirst({
      where: { connectToken: token },
    });

    if (!pendingUser) {
      await sendMessage(
        chatId,
        'Invalid or expired code. Please generate a new one.',
      );
      return NextResponse.json({ ok: true });
    }

    // Link them!
    await prisma.userPreferences.update({
      where: { id: pendingUser.id },
      data: {
        telegramChatId: chatId,
        connectToken: null, // Consume the token
      },
    });

    await sendMessage(
      chatId,
      '✅ Account connected! You can now type logs here directly.',
    );
    return NextResponse.json({ ok: true });
  }

  // SCENARIO B: Logging (User is linked)
  if (existingUser) {
    // Read the name directly from the preferences row we just fetched
    const displayName = existingUser.userName || 'Friend';

    // 1. Check for Redaction
    let finalNote = text;
    let isRedacted = false;

    // Check for /redacted or /secret (Case insensitive)
    if (
      text.toLowerCase().startsWith('/redacted') ||
      text.toLowerCase().startsWith('/secret')
    ) {
      isRedacted = true;
      // Improved Regex: Handles "/redacted:", "/redacted " and "/redacted\n"
      finalNote = text.replace(/^\/(redacted|secret)[:\s]*/i, '').trim();
    }

    try {
      // 2. SAVE TO DB (The important part)
      await prisma.log.create({
        data: {
          userId: existingUser.userId,
          content: { note: finalNote, timestamp: new Date().toISOString() },
          isRedacted: isRedacted,
          tagValues: [],
        },
      });

      // 3. REPLY TO USER (The "Nice to have" part)
      // We wrap this in a separate block so network errors don't scare the user
      try {
        if (isRedacted) {
          await sendMessage(chatId, `🔒 Log saved (Hidden), ${displayName}!`);
        } else {
          await sendMessage(chatId, `📝 Saved, ${displayName}!`);
        }
      } catch (replyError) {
        // If Telegram is down, just log it. Do NOT crash the function.
        console.error('Failed to send reply to Telegram:', replyError);
      }
      // TODO: Here is where we will trigger the "NPC vs Main Character" question next!
    } catch (dbError) {
      console.error('Database Error:', dbError);
      await sendMessage(chatId, 'Error saving log to database.');
    }

    return NextResponse.json({ ok: true });
  }

  await sendMessage(
    chatId,
    'Please connect your account first via the website.',
  );

  return NextResponse.json({ ok: true });
}
