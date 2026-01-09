import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { sendMessage } from '@/lib/telegram/client';
import {
  handleCallback,
  handleLogEntry,
  handleLogout,
  handleNote,
  handleReply,
  handleStart,
} from '@/lib/telegram/handlers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 1. ROUTE: Button Clicks
    if (body.callback_query) {
      await handleCallback(body.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Validation
    if (!body.message || !body.message.text)
      return NextResponse.json({ ok: true });

    const chatId = body.message.chat.id.toString();
    const text = body.message.text.trim();

    // Handle replies (User answering to challenge from bot)
    if (body.message.reply_to_message) {
      await handleReply(body.message);
      return NextResponse.json({ ok: true });
    }

    // 2. ROUTE: Commands
    if (text === '/logout') {
      await handleLogout(chatId);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/note ')) {
      const noteText = text.slice(6).trim(); // Remove "/note "
      if (noteText) {
        const user = await prisma.userPreferences.findUnique({
          where: { telegramChatId: chatId },
        });
        if (user) {
          await handleNote(chatId, noteText, user);
        } else {
          await sendMessage(chatId, 'Please connect your account first via the website.');
        }
      } else {
        await sendMessage(chatId, 'Usage: /note Your thought here');
      }
      return NextResponse.json({ ok: true });
    }

    // 3. ROUTE: Connection Handshake
    // We check user *before* passing to handlers to save DB calls if not needed
    const existingUser = await prisma.userPreferences.findUnique({
      where: { telegramChatId: chatId },
    });

    if (text.startsWith('/start')) {
      await handleStart(chatId, text, existingUser);
      return NextResponse.json({ ok: true });
    }

    // 4. ROUTE: Logging
    if (existingUser) {
      console.log('Logging')
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
    return NextResponse.json({ ok: true });
  }
}
