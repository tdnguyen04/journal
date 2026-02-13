import prisma from '@/lib/prisma/prisma';
import { sendMessage, editMessage, answerCallback } from '../client';
import { applyGapChain, finalizeQuickTask } from '@/lib/helpers/log-operations';

/**
 * Handle callback queries from inline keyboard buttons
 * Supports:
 * - gap:logId:action (chain/skip/specify)
 * - tag:logId:value (tag button clicks)
 */
export async function handleCallback(query: any) {
  const chatId = query.message.chat.id.toString();
  const data = query.data; // "tag:LOGID:VALUE" or "gap:LOGID:ACTION"

  // Ack the click immediately
  await answerCallback(query.id);

  const parts = data.split(':');
  
  // --- GAP BUTTON HANDLING ---
  if (parts.length === 3 && parts[0] === 'gap') {
    const [_, logId, action] = parts;
    
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

      // Fetch the log with ownership check
      const log = await prisma.log.findUnique({
        where: { id: logId, userId: user.userId }
      });

      if (!log) {
        console.error(`[Telegram] Gap callback: Log ${logId} not found`);
        return;
      }

      // Get the previous log for chaining
      const lastLog = await prisma.log.findFirst({
        where: { userId: user.userId, id: { not: log.id }, endedAt: { not: null } },
        orderBy: { endedAt: 'desc' },
      });

      const originalText = query.message.text;

      if (action === 'chain') {
        // "Yes, right after" - chain to previous task
        if (lastLog && lastLog.endedAt && log.endedAt) {
          const updatedLog = await applyGapChain({
            logId: log.id,
            userId: user.userId,
            lastLogEndedAt: lastLog.endedAt,
            mode: 'chain',
          });
          
          const duration = updatedLog.duration || 0;
          // Edit message to show result (remove buttons)
          await editMessage(chatId, query.message.message_id, `${originalText}\n\n✅ Logged as ${duration}m task.`);
        } else {
          // Edge case: chaining failed (missing lastLog or endedAt), but still clear challenge fields
          // Use finalizeQuickTask to clear challenge fields and set as quick task
          await finalizeQuickTask({
            logId: log.id,
            userId: user.userId,
          });
          
          await editMessage(chatId, query.message.message_id, `${originalText}\n\n✅ Logged!`);
        }
      } else if (action === 'skip') {
        // "Skip" - save as quick task with duration 0
        // Note: applyGapChain requires lastLogEndedAt, but for skip we don't need it
        // We'll use log.endedAt as placeholder (not used in skip mode anyway)
        if (!log.endedAt) {
          // Fallback: use finalizeQuickTask if endedAt is missing
          await finalizeQuickTask({
            logId: log.id,
            userId: user.userId,
          });
        } else {
          await applyGapChain({
            logId: log.id,
            userId: user.userId,
            lastLogEndedAt: log.endedAt, // Placeholder - not used in skip mode
            mode: 'skip',
          });
        }
        // Edit message to show result (remove buttons)
        await editMessage(chatId, query.message.message_id, `${originalText}\n\n📌 Saved as quick task.`);
      } else if (action === 'specify') {
        // "Let me specify..." - ask for duration
        // Update challenge type so handleReply knows what to do
        await prisma.log.update({
          where: { id: log.id },
          data: { telegramChallengeType: 'GAP_DURATION' },
        });

        // Edit original message to remove buttons
        await editMessage(chatId, query.message.message_id, `${originalText}\n\n⏱️ How long did it take?`);
        
        // Send follow-up asking for duration
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
    } catch (e) {
      console.error('Database Error during gap handling:', e);
      await sendMessage(chatId, 'Hmm, something went wrong. Try again in a moment?');
    }
    return;
  }

  // --- TAG BUTTON HANDLING ---
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
