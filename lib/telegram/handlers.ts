// lib/telegram/handlers.ts
import prisma from '@/lib/prisma/prisma';
import {
  sendMessage,
  editMessage,
  answerCallback,
  sendTypingAction,
} from './client';
import { parseDurationWithAI } from './ai';

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
      // Get the user linked to this chatId
      const user = await prisma.userPreferences.findUnique({
        where: { telegramChatId: chatId },
        select: { userId: true }
      });

      if (!user) {
        await sendMessage(chatId, "I don't recognize you yet! Open the app → Settings → Connect Telegram to link your account.");
        return;
      }

      // Fetch log with ownership verification
      const currentLog = await prisma.log.findUnique({ 
        where: { id: logId, userId: user.userId }  // ← Ownership check
      });

      if (currentLog) {
        const currentTags = currentLog.tagValues || [];
        const updatedTags = currentTags.includes(valueToAdd)
          ? currentTags
          : [...currentTags, valueToAdd];

        // Update with ownership check (defense in depth)
        await prisma.log.updateMany({
          where: { id: logId, userId: user.userId },
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
      await sendMessage(chatId, 'Hmm, something went wrong saving that tag. Try again in a moment?');
    }
  }
}

// --- AUTH & COMMANDS ---
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

// --- HELPER: Cleanup Stale Logs ---
async function finalizeStaleLogs(userId: string, chatId: string) {
  // LOG: Start Check
  console.log(`[Telegram] 🧹 Checking for stale logs for User ${userId}...`);

  const staleLog = await prisma.log.findFirst({
    where: { userId: userId, telegramChallengeId: { not: null } },
  });

  if (staleLog && staleLog.telegramChallengeId) {
    console.log(
      `[Telegram] ⚠️ Found stale log "${staleLog.id}". Cleaning up...`,
    );

    // 1. Close DB State - assume quick task when skipped
    await prisma.log.update({
      where: { id: staleLog.id },
      data: {
        telegramChallengeId: null,
        telegramChallengeType: null,
        status: 'COMPLETED',
        duration: 0,
      },
    });

    // 2. UI Cleanup (Attempt)
    const note = (staleLog.content as any)?.note || 'Log';
    const timezone = await getUserTimezone(userId);
    const timeStr = formatFriendlyDate(staleLog.startedAt, timezone);

    // We use a try/catch here because if this fails, we don't want to crash the whole flow
    try {
      await editMessage(
        chatId,
        parseInt(staleLog.telegramChallengeId),
        `📌 "${note}" - saved as quick task`,
      );
      await sendMessage(
        chatId,
        `📌 Saved your previous entry "${note}" as a quick task (${timeStr}).`,
      );
    } catch (e) {
      console.error(`[Telegram] ❌ Failed to send cleanup message:`, e);
    }
  } else {
    console.log(`[Telegram] ✅ No stale logs found.`);
  }
}

// --- 1. HANDLE REPLIES (The Conversation) ---
export async function handleReply(message: any) {
  const chatId = message.chat.id.toString();
  const replyToId = message.reply_to_message.message_id.toString();
  const text = message.text.trim();

  await sendTypingAction(chatId);

  const log = await prisma.log.findUnique({
    where: { telegramChallengeId: replyToId },
  });
  if (!log || !log.telegramChallengeType) return;

  const lastLog = await prisma.log.findFirst({
    where: { userId: log.userId, id: { not: log.id }, endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  });

  // SCENARIO A: GAP_CONFIRM
  if (log.telegramChallengeType === 'GAP_CONFIRM') {
    const isYes = ['yes', 'yep', 'yeah', 'y', 'sure'].includes(
      text.toLowerCase(),
    );

    if (isYes) {
      if (lastLog && lastLog.endedAt) {
        const duration = Math.round(
          (log.endedAt!.getTime() - lastLog.endedAt.getTime()) / 60000,
        );
        await prisma.log.update({
          where: { id: log.id },
          data: {
            startedAt: lastLog.endedAt,
            duration,
            telegramChallengeId: null,
            telegramChallengeType: null,
            status: 'COMPLETED', // <--- VERIFIED!
          },
        });
        await sendMessage(chatId, `🔗 Perfect! Logged as ${duration}m task.`);
      }
    } else {
      // User said No -> Ask Duration
      const msg = await sendMessage(
        chatId,
        "Got it! How long did it take?\nExamples: 30m, 1h, 1h30m",
        { force_reply: true },
      );
      if (msg?.result) {
        await prisma.log.update({
          where: { id: log.id },
          data: {
            telegramChallengeId: msg.result.message_id.toString(),
            telegramChallengeType: 'GAP_DURATION',
          },
        });
      }
    }
  }

  // SCENARIO B: GAP_DURATION
  else if (log.telegramChallengeType === 'GAP_DURATION') {
    const minutes = await parseDurationWithAI(text);

    if (minutes !== null) {
      const newStartTime = new Date(log.endedAt!.getTime() - minutes * 60000);

      let warningMsg = '';
      if (lastLog && lastLog.endedAt && newStartTime < lastLog.endedAt) {
        const overlapMins = Math.round(
          (lastLog.endedAt.getTime() - newStartTime.getTime()) / 60000,
        );
        const lastNote = (lastLog.content as any)?.note || 'task';
        warningMsg = `\n\n⚠️ **Note:** Overlaps with "${lastNote.substring(0, 15)}..." by ${overlapMins}m.`;
      }

      await prisma.log.update({
        where: { id: log.id },
        data: {
          startedAt: newStartTime,
          duration: minutes,
          telegramChallengeId: null,
          telegramChallengeType: null,
          status: 'COMPLETED', // <--- VERIFIED!
        },
      });

      const timezone = await getUserTimezone(log.userId);
      const timeStr = formatFriendlyDate(newStartTime, timezone);
      await sendMessage(
        chatId,
        `✅ Logged! ${minutes}m task starting at ${timeStr}.${warningMsg}`,
      );
    } else {
      const msg = await sendMessage(
        chatId,
        "Hmm, I didn't catch that. Try something like:\n• 30m\n• 1h\n• 1h30m",
        { force_reply: true },
      );
      if (msg?.result) {
        await prisma.log.update({
          where: { id: log.id },
          data: { telegramChallengeId: msg.result.message_id.toString() },
        });
      }
    }
  }
}
// --- 2. HANDLE NOTE (Fleeting Thought - no time tracking) ---
export async function handleNote(chatId: string, text: string, user: any) {
  console.log(`[Telegram] 📝 New Note: "${text}"`);

  await sendTypingAction(chatId);

  try {
    await prisma.log.create({
      data: {
        userId: user.userId,
        content: { note: text },
        // Notes have no endedAt/duration (distinguishes from tasks)
        // startedAt uses default, but endedAt being null marks this as a note
        endedAt: null,
        duration: null,
        status: 'COMPLETED',
      },
    });

    await sendMessage(chatId, `📝 Got it! Saved as a quick note.`);
  } catch (e) {
    console.error(`[Telegram] 💥 Note DB Error:`, e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
  }
}

// --- 3. LOG ENTRY (The Gap Checker) ---
export async function handleLogEntry(chatId: string, text: string, user: any) {
  // Check for quick chain prefix ">"
  const isQuickChain = text.startsWith('>');
  const logText = isQuickChain ? text.slice(1).trim() : text;

  if (isQuickChain && !logText) {
    await sendMessage(chatId, "After > type what you did.\nExample: > Morning standup");
    return;
  }

  console.log(`[Telegram] 📥 New Log Request: "${logText}" (Quick chain: ${isQuickChain})`);

  // 1. SIGNAL: "Typing..."
  await sendTypingAction(chatId);

  // 2. CLEANUP
  await finalizeStaleLogs(user.userId, chatId);

  const now = new Date();

  // 3. CALCULATE GAPS
  const lastLog = await prisma.log.findFirst({
    where: { userId: user.userId, endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  });

  let gapMinutes = 0;
  if (lastLog && lastLog.endedAt) {
    gapMinutes = Math.round(
      (now.getTime() - lastLog.endedAt.getTime()) / 60000,
    );
    console.log(
      `[Telegram] ⏱️ Gap detected: ${gapMinutes} mins (Last log: ${lastLog.id})`,
    );
  }

  // Quick chain OR Implicit Chain Rule (< 15 mins)
  const isImplicitChain =
    gapMinutes >= 0 && gapMinutes <= 15 && lastLog?.endedAt;
  const shouldChain = isQuickChain || isImplicitChain;
  const chainStart = shouldChain && lastLog?.endedAt ? lastLog.endedAt : now;
  
  // Quick chain always completes, implicit chain completes, gap > 15 is tentative
  const initialStatus = shouldChain ? 'COMPLETED' : (gapMinutes > 15 ? 'TENTATIVE' : 'COMPLETED');

  console.log(
    `[Telegram] 💾 Saving Log. Status: ${initialStatus}. Start: ${chainStart.toISOString()}`,
  );

  // Calculate duration if chaining
  const duration = shouldChain && lastLog?.endedAt
    ? Math.round((now.getTime() - lastLog.endedAt.getTime()) / 60000)
    : 0;

  // 4. SAVE TO DB
  let newLog;
  try {
    newLog = await prisma.log.create({
      data: {
        userId: user.userId,
        content: { note: logText },
        startedAt: chainStart,
        endedAt: now,
        duration: duration,
        status: initialStatus,
      },
    });
  } catch (e) {
    console.error(`[Telegram] 💥 DB Error:`, e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
    return;
  }

  // 5. DETERMINE RESPONSE
  const timezone = await getUserTimezone(user.userId);
  
  if (initialStatus === 'TENTATIVE') {
    // PREPARE QUESTION
    const lastTime = formatFriendlyDate(lastLog!.endedAt!, timezone);
    const lastNote = (lastLog?.content as any)?.note || 'task';
    const lastNoteDisplay =
      lastNote.length > 20 ? lastNote.substring(0, 20) + '...' : lastNote;

    const hours = Math.floor(gapMinutes / 60);
    const mins = gapMinutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    console.log(`[Telegram] ❓ Sending Gap Challenge...`);

    const msg = await sendMessage(
      chatId,
      `📝 Saved "${logText}".\n\nIt's been ${durationStr} since **"${lastNoteDisplay}"** (${lastTime}).\n\nDid you start this immediately after?`,
      { force_reply: true, input_field_placeholder: 'Yes or No' },
    );

    // CRITICAL FAILURE CHECK
    if (msg?.result) {
      await prisma.log.update({
        where: { id: newLog.id },
        data: {
          telegramChallengeId: msg.result.message_id.toString(),
          telegramChallengeType: 'GAP_CONFIRM',
        },
      });
      console.log(`[Telegram] ✅ Challenge Active. Log ID: ${newLog.id}`);
    } else {
      console.error(
        `[Telegram] 🚨 CRITICAL: Message failed after retries. Log ${newLog.id} remains TENTATIVE/UNCONFIRMED.`,
      );
    }
  } else {
    // SUCCESS (Quick chain or implicit chain)
    console.log(`[Telegram] ✅ Chain complete. Sending success message.`);
    
    if (shouldChain && lastLog) {
      const timeStr = lastLog.endedAt!.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      });
      const durationStr = duration ? `${duration}m` : '';
      const msg = isQuickChain 
        ? `✅ Logged! ${durationStr} task from ${timeStr}.`
        : `✅ Logged! ${durationStr} task starting at ${timeStr}.`;
      await sendMessage(chatId, msg);
    } else {
      // First task or no chain
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      });
      await sendMessage(chatId, `✅ Logged at ${timeStr}!`);
    }
  }
}

function formatFriendlyDate(date: Date, timezone: string = 'UTC'): string {
  const now = new Date();
  
  // Format dates in user's timezone for comparison
  const dateInTz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const isToday = dateInTz.toDateString() === nowInTz.toDateString();

  // Check if yesterday
  const yesterday = new Date(nowInTz);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateInTz.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;

  // Format: Jan 5, 9:00 PM
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone })}, ${timeStr}`;
}

// Helper to get user timezone
async function getUserTimezone(userId: string): Promise<string> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return prefs?.timezone || 'UTC';
}
