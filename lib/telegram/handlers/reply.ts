import prisma from '@/lib/prisma/prisma';
import { sendMessage, deleteMessage, sendTypingAction } from '../client';
import { parseDurationWithAI } from '../ai';
import { applyGapChain, finalizeQuickTask } from '@/lib/helpers/log-operations';
import { getUserTimezone, formatFriendlyDate } from '../utils/timezone';

/**
 * Handle replies to bot messages (gap confirmations and duration prompts)
 */
export async function handleReply(message: any) {
  const chatId = message.chat.id.toString();
  const replyToId = message.reply_to_message.message_id.toString();
  const text = message.text.trim();

  await sendTypingAction(chatId);

  const log = await prisma.log.findUnique({
    where: { telegramChallengeId: replyToId },
  });
  
  if (!log || !log.telegramChallengeType) {
    return;
  }

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
      if (lastLog && lastLog.endedAt && log.endedAt) {
        const updatedLog = await applyGapChain({
          logId: log.id,
          userId: log.userId,
          lastLogEndedAt: lastLog.endedAt,
          mode: 'chain',
        });
        const duration = updatedLog.duration || 0;
        await sendMessage(chatId, `🔗 Perfect! Logged as ${duration}m task.`);
      } else {
        // Edge case: User said "yes" but chaining failed (missing lastLog or endedAt)
        // Still clear challenge fields to prevent stale state and repeated force_reply
        await finalizeQuickTask({
          logId: log.id,
          userId: log.userId,
        });
        await sendMessage(chatId, `✅ Logged!`);
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

      // We're done with this prompt – delete the original force_reply question
      try {
        await deleteMessage(chatId, parseInt(replyToId, 10));
      } catch (e) {
        // Non-fatal: if deletion fails, we still proceed with logging
        console.error('[Telegram] Failed to delete duration prompt message:', e);
      }

      await applyGapChain({
        logId: log.id,
        userId: log.userId,
        lastLogEndedAt: log.endedAt!, // Used to calculate newStartTime
        mode: 'duration',
        durationMinutes: minutes,
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
        // Point the log at the *new* prompt message
        await prisma.log.update({
          where: { id: log.id },
          data: { telegramChallengeId: msg.result.message_id.toString() },
        });

        // Clean up the previous bad prompt so there's only one visible question
        try {
          await deleteMessage(chatId, parseInt(replyToId, 10));
        } catch (e) {
          console.error('[Telegram] Failed to delete previous duration prompt:', e);
        }
      }
    }
  }
}
