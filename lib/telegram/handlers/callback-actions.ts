import prisma from '@/lib/prisma/prisma';
import { sendMessage, editMessage } from '../bot-api';
import { applyGapChain, finalizeQuickTask } from '@/lib/helpers/log-operations';

// Constants
const NOT_CONNECTED_MSG = "I don't recognize you yet! Open the app → Settings → Connect Telegram to link your account.";

/**
 * Get user by Telegram chat ID (shared helper)
 */
export async function getUserByChatId(chatId: string) {
  return await prisma.userPreferences.findUnique({
    where: { telegramChatId: chatId },
    select: { userId: true }
  });
}

/**
 * Handle "Yes, right after" - chain to previous task
 */
export async function handleChainAction(
  chatId: string,
  log: any,
  userId: string,
  messageId: number,
  originalText: string
) {
  const previousLog = await prisma.log.findFirst({
    where: { userId, id: { not: log.id }, endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  });

  if (previousLog?.endedAt && log.endedAt) {
    const updatedLog = await applyGapChain({
      logId: log.id,
      userId,
      lastLogEndedAt: previousLog.endedAt,
      mode: 'chain',
    });
    const duration = updatedLog.duration || 0;
    await editMessage(chatId, messageId, `${originalText}\n\n✅ Logged as ${duration}m task.`);
  } else {
    // Edge case: chaining failed, but still clear challenge fields
    await finalizeQuickTask({ logId: log.id, userId });
    await editMessage(chatId, messageId, `${originalText}\n\n✅ Logged!`);
  }
}

/**
 * Handle "Skip" - save as quick task (duration 0)
 */
export async function handleSkipAction(
  chatId: string,
  log: any,
  userId: string,
  messageId: number,
  originalText: string
) {
  await finalizeQuickTask({ logId: log.id, userId });
  await editMessage(chatId, messageId, `${originalText}\n\n📌 Saved as quick task.`);
}

/**
 * Handle "Let me specify..." - ask for duration
 */
export async function handleSpecifyAction(
  chatId: string,
  log: any,
  messageId: number,
  originalText: string
) {
  await prisma.log.update({
    where: { id: log.id },
    data: { telegramChallengeType: 'GAP_DURATION' },
  });

  await editMessage(chatId, messageId, `${originalText}\n\n⏱️ How long did it take?`);
  
  const msg = await sendMessage(
    chatId,
    "Tell me the duration:\nExamples: 30m, 1h, 1h30m",
    { force_reply: true }
  );
  
  if (msg?.result) {
    await prisma.log.update({
      where: { id: log.id },
      data: { telegramChallengeId: msg.result.message_id.toString() },
    });
  }
}

/**
 * Handle gap callback actions (chain/skip/specify)
 */
export async function handleGapCallback(
  chatId: string,
  logId: string,
  action: string,
  messageId: number,
  originalText: string
) {
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendMessage(chatId, NOT_CONNECTED_MSG);
    return;
  }

  const log = await prisma.log.findUnique({
    where: { id: logId, userId: user.userId }
  });

  if (!log) {
    console.error(`[Telegram] Gap callback: Log ${logId} not found`);
    return;
  }

  switch (action) {
    case 'chain':
      await handleChainAction(chatId, log, user.userId, messageId, originalText);
      break;
    case 'skip':
      await handleSkipAction(chatId, log, user.userId, messageId, originalText);
      break;
    case 'specify':
      await handleSpecifyAction(chatId, log, messageId, originalText);
      break;
  }
}

/**
 * Handle tag button clicks
 */
export async function handleTagCallback(
  chatId: string,
  logId: string,
  tagValue: string,
  messageId: number,
  originalText: string,
  replyMarkup: any
) {
  const user = await getUserByChatId(chatId);
  if (!user) {
    await sendMessage(chatId, NOT_CONNECTED_MSG);
    return;
  }

  const log = await prisma.log.findUnique({ 
    where: { id: logId, userId: user.userId }
  });

  if (!log) {
    console.error(`[Telegram] Tag callback: Log ${logId} not found`);
    return;
  }

  const currentTags = log.tagValues || [];
  if (currentTags.includes(tagValue)) {
    return; // Tag already exists
  }

  await prisma.log.updateMany({
    where: { id: logId, userId: user.userId },
    data: { tagValues: [...currentTags, tagValue] },
  });

  // Update UI to show the tag was added
  if (!originalText.includes(`#${tagValue}`)) {
    await editMessage(chatId, messageId, `${originalText} #${tagValue}`, replyMarkup);
  }
}
