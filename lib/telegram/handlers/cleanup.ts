import prisma from '@/lib/prisma/prisma';
import { sendMessage, editMessage } from '../bot-api';
import { finalizeQuickTask } from '@/lib/helpers/log-operations';
import { getUserTimezone, formatFriendlyDate } from '../utils/timezone';

/**
 * Cleanup stale logs (logs with pending telegramChallengeId)
 * Called before processing new log entries to prevent stale state
 */
export async function finalizeStaleLogs(userId: string, chatId: string) {
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
    await finalizeQuickTask({
      logId: staleLog.id,
      userId: userId,
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
