import prisma from '@/lib/prisma/prisma';
import { sendMessage, sendTypingAction } from '../bot-api';
import { createNote, createTask } from '@/lib/helpers/log-operations';
import { generateNoteAck, parseInsertInput } from '../ai';
import { getUserTimezone, formatFriendlyDate } from '../utils/timezone';

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

const INSERT_HELP = `Send task name, start time, and end time (all required). Times must be in the past.

Examples:
• /insert Team standup 9:00 9:15
• /insert Meeting 2pm 3pm

If you omit the date, today is assumed.`;

/**
 * Handle /insert command - backfill a task with custom start/end times
 */
export async function handleInsert(chatId: string, text: string, user: any) {
  const payload = text === '/insert' ? '' : text.slice(7).trim();
  if (!payload) {
    await sendMessage(chatId, INSERT_HELP);
    return;
  }

  await sendTypingAction(chatId);

  const timezone = await getUserTimezone(user.userId);
  const now = new Date();
  const todayIsoDate = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  const nowIso = now.toISOString();

  const parsed = await parseInsertInput(payload, timezone, todayIsoDate, nowIso);
  if (!parsed?.taskName?.trim() || !parsed.startedAtIso?.trim() || !parsed.endedAtIso?.trim()) {
    await sendMessage(chatId, 'I need task name, start time, and end time.\n\n' + INSERT_HELP);
    return;
  }

  const startedAt = new Date(parsed.startedAtIso);
  const endedAt = new Date(parsed.endedAtIso);
  if (startedAt >= endedAt) {
    await sendMessage(chatId, 'Start time must be before end time. Please correct and try again.');
    return;
  }
  if (endedAt > now || startedAt > now) {
    await sendMessage(chatId, "Times must be in the past. Use /insert to backfill tasks you forgot to log.");
    return;
  }

  const existingTasks = await prisma.log.findMany({
    where: { userId: user.userId, endedAt: { not: null } },
    select: { id: true, startedAt: true, endedAt: true, content: true },
  });
  const overlaps: { name: string; start: Date; end: Date }[] = [];
  for (const log of existingTasks) {
    if (!log.endedAt || !log.startedAt) continue;
    if (startedAt.getTime() < log.endedAt.getTime() && log.startedAt.getTime() < endedAt.getTime()) {
      const name = (log.content as any)?.note ?? 'Task';
      overlaps.push({ name, start: log.startedAt, end: log.endedAt });
    }
  }
  if (overlaps.length > 0) {
    const list = overlaps.map((o) => `• "${o.name}" (${formatFriendlyDate(o.start, timezone)} – ${formatFriendlyDate(o.end, timezone)})`).join('\n');
    await sendMessage(chatId, `This overlaps with existing tasks:\n${list}\n\nPlease pick a different time range.`);
    return;
  }

  try {
    await createTask({
      userId: user.userId,
      text: parsed.taskName.trim(),
      startedAt,
      endedAt,
      source: 'telegram',
    });
    const startStr = formatFriendlyDate(startedAt, timezone);
    const endStr = formatFriendlyDate(endedAt, timezone);
    await sendMessage(chatId, `✅ Logged: "${parsed.taskName.trim()}" from ${startStr} to ${endStr}.`);
  } catch (e) {
    console.error('[Telegram] Insert createTask error:', e);
    await sendMessage(chatId, 'Something went wrong saving that. Try again in a moment?');
  }
}
