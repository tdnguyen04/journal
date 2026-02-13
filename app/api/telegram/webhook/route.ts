import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { sendMessage } from '@/lib/telegram/bot-api';
import {
  handleCallback,
  handleLogEntry,
  handleInsert,
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

    // Handle non-text messages (photos, voice, stickers, etc.)
    if (body.message && !body.message.text) {
      const chatId = body.message.chat.id.toString();
      await sendMessage(
        chatId,
        "I can only read text messages right now. Try typing what you did instead!"
      );
      return NextResponse.json({ ok: true });
    }

    // No message at all - nothing to process
    if (!body.message) return NextResponse.json({ ok: true });

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

    // Check user connection for commands that need it
    const existingUser = await prisma.userPreferences.findUnique({
      where: { telegramChatId: chatId },
    });

    const notConnectedMsg = "I don't recognize you yet! Open the app → Settings → Connect Telegram to link your account.";

    if (text === '/help') {
      if (!existingUser) {
        await sendMessage(chatId, notConnectedMsg);
      } else {
        await sendMessage(
          chatId,
          "📖 **How to use this bot**\n\n" +
          "**Log a task** (with time tracking)\n" +
          "Just type what you did:\n" +
          "→ Finished the report\n" +
          "→ 30 min gym session\n\n" +
          "**Quick chain** (connects to last task)\n" +
          "Start with >\n" +
          "→ > Team meeting\n\n" +
          "**Quick note** (no time tracking)\n" +
          "/note Your thought here\n" +
          "→ /note Remember to call mom\n\n" +
          "**Commands**\n" +
          "/help - Show this message\n" +
          "/insert - Backfill a past task (task start end)\n" +
          "/logout - Disconnect account"
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Handle /note with or without content
    if (text === '/note' || text.startsWith('/note ')) {
      if (!existingUser) {
        await sendMessage(chatId, notConnectedMsg);
        return NextResponse.json({ ok: true });
      }
      
      const noteText = text === '/note' ? '' : text.slice(6).trim();
      if (noteText) {
        await handleNote(chatId, noteText, existingUser);
      } else {
        await sendMessage(chatId, "What's the thought? Try:\n/note Feeling productive today");
      }
      return NextResponse.json({ ok: true });
    }

    // /insert - backfill past task (requires connected user)
    if (text === '/insert' || text.startsWith('/insert ')) {
      if (!existingUser) {
        await sendMessage(chatId, notConnectedMsg);
        return NextResponse.json({ ok: true });
      }
      await handleInsert(chatId, text, existingUser);
      return NextResponse.json({ ok: true });
    }

    // 3. ROUTE: Connection Handshake

    if (text.startsWith('/start')) {
      await handleStart(chatId, text, existingUser);
      return NextResponse.json({ ok: true });
    }

    // 4. ROUTE: Logging
    if (existingUser) {
      await handleLogEntry(chatId, text, existingUser);
    } else {
      await sendMessage(
        chatId,
        "I don't recognize you yet! Open the app → Settings → Connect Telegram to link your account.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('General Webhook Error:', error);
    return NextResponse.json({ ok: true });
  }
}
