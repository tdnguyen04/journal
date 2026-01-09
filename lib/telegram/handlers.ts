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
        await sendMessage(chatId, '⚠️ Please connect your account first.');
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
      await sendMessage(chatId, '⚠️ Database Error: Could not save that tag.');
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
      await sendMessage(chatId, '🔌 Disconnected. Connect again via website.');
    } else {
      await sendMessage(chatId, 'You are not connected.');
    }
  } catch (e) {
    console.error('Logout DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error.');
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
      if (existingUser) await sendMessage(chatId, 'You are already connected!');
      else await sendMessage(chatId, 'Invalid or expired code.');
      return;
    }

    await prisma.userPreferences.update({
      where: { id: pendingUser.id },
      data: { telegramChatId: chatId, connectToken: null },
    });

    await sendMessage(
      chatId,
      '✅ Account connected! You can now type logs directly.',
    );
  } catch (e) {
    console.error('Start DB Error', e);
    await sendMessage(chatId, '⚠️ Database Error.');
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

    // 1. Close DB State
    await prisma.log.update({
      where: { id: staleLog.id },
      data: {
        telegramChallengeId: null,
        telegramChallengeType: null,
        status: 'TENTATIVE',
      },
    });

    // 2. UI Cleanup (Attempt)
    const note = (staleLog.content as any)?.note || 'Log';
    const timeStr = formatFriendlyDate(staleLog.startedAt);

    // We use a try/catch here because if this fails, we don't want to crash the whole flow
    try {
      await editMessage(
        chatId,
        parseInt(staleLog.telegramChallengeId),
        `⚠️ Saved "${note}" (Unconfirmed).`,
      );
      await sendMessage(
        chatId,
        `⚠️ Previous log "${note}" was abandoned.\nMarked as **Tentative** (Assumed start: ${timeStr}).`,
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
        await sendMessage(chatId, `🔗 Chained! Duration: ${duration}m`);
      }
    } else {
      // User said No -> Ask Duration
      const msg = await sendMessage(
        chatId,
        "Okay. How long did this task take? (e.g. '30m', '1h')",
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

      const timeStr = formatFriendlyDate(newStartTime);
      await sendMessage(
        chatId,
        `✅ Updated. Started at ${timeStr}.${warningMsg}`,
      );
    } else {
      const msg = await sendMessage(
        chatId,
        "I didn't catch that time. Try '30m'.",
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
// --- 2. LOG ENTRY (The Gap Checker) ---
export async function handleLogEntry(chatId: string, text: string, user: any) {
  console.log(`[Telegram] 📥 New Log Request: "${text}"`);

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

  // Implicit Chain Rule (< 15 mins)
  const isImplicitChain =
    gapMinutes >= 0 && gapMinutes <= 15 && lastLog?.endedAt;
  const implicitStart = isImplicitChain ? lastLog!.endedAt! : now;
  const initialStatus =
    !isImplicitChain && gapMinutes > 15 ? 'TENTATIVE' : 'COMPLETED';

  console.log(
    `[Telegram] 💾 Saving Log. Status: ${initialStatus}. Start: ${implicitStart.toISOString()}`,
  );

  // 4. SAVE TO DB
  let newLog;
  try {
    newLog = await prisma.log.create({
      data: {
        userId: user.userId,
        content: { note: text },
        startedAt: implicitStart,
        endedAt: now,
        status: initialStatus,
      },
    });
  } catch (e) {
    console.error(`[Telegram] 💥 DB Error:`, e);
    await sendMessage(chatId, '⚠️ Database Error.');
    return;
  }

  // 5. DETERMINE RESPONSE
  if (initialStatus === 'TENTATIVE') {
    // PREPARE QUESTION
    const lastTime = formatFriendlyDate(lastLog!.endedAt!);
    const lastNote = (lastLog?.content as any)?.note || 'task';
    const lastNoteDisplay =
      lastNote.length > 20 ? lastNote.substring(0, 20) + '...' : lastNote;

    const hours = Math.floor(gapMinutes / 60);
    const mins = gapMinutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    console.log(`[Telegram] ❓ Sending Gap Challenge...`);

    const msg = await sendMessage(
      chatId,
      `📝 Saved "${text}".\n\nIt's been ${durationStr} since **"${lastNoteDisplay}"** (${lastTime}).\n\nDid you start this immediately after?`,
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
      // THIS IS YOUR "3 FAILURES" HANDLING
      console.error(
        `[Telegram] 🚨 CRITICAL: Message failed after retries. Log ${newLog.id} remains TENTATIVE/UNCONFIRMED.`,
      );
      // Note: We do NOT delete the log. We keep it as TENTATIVE.
      // The user will see it in the dashboard later.
    }
  } else {
    // IMPLICIT SUCCESS
    console.log(`[Telegram] ✅ Implicit Chain. Sending success message.`);
    let extraInfo = '';
    if (isImplicitChain && lastLog) {
      const lastNote = (lastLog.content as any)?.note || 'task';
      const timeStr = lastLog.endedAt!.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      extraInfo = ` Started at ${timeStr} (after "${lastNote.substring(0, 15)}...").`;
    }

    // We don't await this strictly for flow control, but good to catch errors
    await sendMessage(chatId, `✅ Saved.${extraInfo}`);
  }
}

function formatFriendlyDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;

  // Format: Jan 5, 9:00 PM
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}
