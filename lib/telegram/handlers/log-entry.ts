import prisma from '@/lib/prisma/prisma';
import { sendMessage, sendTypingAction, type TelegramMessageResult } from '../bot-api';
import { createTask } from '@/lib/helpers/log-operations';
import { generateGapCheckIn, summarizeTask } from '../ai';
import { getUserPrefs, formatGapDuration, getTimeOfDay } from '../utils/timezone';
import { finalizeStaleLogs } from './cleanup';

/**
 * Handle main log entry (task logging with gap detection)
 * Supports quick chain prefix ">" and implicit chaining based on gap threshold
 */
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

  // Get user preferences (timezone + auto-chain threshold)
  const { timezone, autoChainMinutes } = await getUserPrefs(user.userId);

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
      `[Telegram] ⏱️ Gap detected: ${gapMinutes} mins (Last log: ${lastLog.id}, threshold: ${autoChainMinutes})`,
    );
  }

  // Quick chain OR Implicit Chain Rule (within user's threshold)
  const isImplicitChain =
    gapMinutes >= 0 && gapMinutes <= autoChainMinutes && lastLog?.endedAt;
  const shouldChain = isQuickChain || isImplicitChain;
  const chainStart = shouldChain && lastLog?.endedAt ? lastLog.endedAt : now;
  
  // Quick chain always completes, implicit chain completes, gap > threshold is tentative
  const initialStatus = shouldChain ? 'COMPLETED' : (gapMinutes > autoChainMinutes ? 'TENTATIVE' : 'COMPLETED');

  console.log(
    `[Telegram] 💾 Saving Log. Status: ${initialStatus}. Start: ${chainStart.toISOString()}`,
  );

  // Calculate duration if chaining
  const duration = shouldChain && lastLog?.endedAt
    ? Math.round((now.getTime() - lastLog.endedAt.getTime()) / 60000)
    : 0;

  // 4. SAVE TO DB using operations API
  let newLog;
  try {
    newLog = await createTask({
      userId: user.userId,
      text: logText,
      startedAt: chainStart,
      endedAt: now,
      duration: duration,
      status: initialStatus,
      source: 'telegram',
    });
  } catch (e) {
    console.error(`[Telegram] 💥 DB Error:`, e);
    await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
    return;
  }

  // 5. DETERMINE RESPONSE
  if (initialStatus === 'TENTATIVE') {
    // Get context for AI message
    const lastNote = (lastLog?.content as any)?.note || 'your last task';
    // Use full text if short, or AI-summarized if long (no truncation with ...)
    const lastNoteDisplay = await summarizeTask(lastNote);
    const gapDurationStr = formatGapDuration(gapMinutes);
    const timeOfDay = getTimeOfDay(now, timezone);
    
    // Count today's tasks for context
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const taskCountToday = await prisma.log.count({
      where: {
        userId: user.userId,
        endedAt: { not: null },
        createdAt: { gte: startOfDay },
      },
    });

    console.log(`[Telegram] ❓ Generating AI gap check-in...`);

    // Generate warm AI message
    const aiMessage = await generateGapCheckIn({
      currentTask: logText,
      lastTask: lastNoteDisplay,
      gapDuration: gapDurationStr,
      taskCountToday,
      timeOfDay,
    });

    // Send with inline buttons (no force_reply!)
    const msg = await sendMessage(chatId, aiMessage, {
      inline_keyboard: [
        [
          { text: 'Yes, right after', callback_data: `gap:${newLog.id}:chain` },
          { text: 'Skip', callback_data: `gap:${newLog.id}:skip` },
        ],
        [
          { text: 'Let me specify...', callback_data: `gap:${newLog.id}:specify` },
        ],
      ],
    });

    // Track the message for callback handling
    if (msg && msg.ok && msg.result) {
      const result = msg.result as TelegramMessageResult;
      await prisma.log.update({
        where: { id: newLog.id },
        data: {
          telegramChallengeId: result.message_id.toString(),
          telegramChallengeType: 'GAP_CONFIRM',
        },
      });
      console.log(`[Telegram] ✅ Gap check-in sent. Log ID: ${newLog.id}`);
    } else {
      console.error(
        `[Telegram] 🚨 CRITICAL: Message failed after retries. Log ${newLog.id} remains TENTATIVE.`,
      );
    }
  } else {
    // SUCCESS (Quick chain or implicit chain)
    console.log(`[Telegram] ✅ Chain complete. Sending success message.`);
    
    if (shouldChain && lastLog) {
      const lastNote = (lastLog.content as any)?.note || 'previous task';
      const lastNoteDisplay = lastNote.length > 30 ? lastNote.substring(0, 30) + '...' : lastNote;
      const startTimeStr = lastLog.endedAt!.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
      });
      const durationStr = duration ? `${duration}m` : '';
      
      // Informative message: show previous task, duration, and hint about settings
      const msg = `✅ Logged! ${durationStr} task chained from "${lastNoteDisplay}" (${startTimeStr}).\n\nAuto-chain threshold: ${autoChainMinutes}m. Adjust in Settings.`;
      await sendMessage(chatId, msg);
    } else {
      // First task or no chain
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
      });
      await sendMessage(chatId, `✅ Logged at ${timeStr}!`);
    }
  }
}
