import { Log } from '@/app/generated/prisma/client';
import { Analysis } from '@/lib/validations/analysis';
import prisma from '@/lib/prisma/prisma';
import { LogContent } from './log';

// ============================================================================
// LOG OPERATIONS API
// ============================================================================
// General-purpose operations for Log mutations. Callers provide explicit
// values (especially times), operations enforce business rules.
// 
// NOTE: This file is SERVER-ONLY (uses Prisma). For client-safe helpers,
// see lib/helpers/log.ts

export type LogSource = 'telegram' | 'browser';

export interface CreateTaskParams {
  userId: string;
  text: string;
  startedAt: Date;
  endedAt: Date;
  duration?: number; // If not provided, calculated from startedAt/endedAt
  status?: 'COMPLETED' | 'TENTATIVE';
  source: LogSource;
}

export interface CreateNoteParams {
  userId: string;
  text: string;
  source: LogSource;
}

export interface UpdateLogContentParams {
  logId: string;
  userId: string;
  newContent: LogContent;
}

export interface UpdateLogTimesParams {
  logId: string;
  userId: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export interface DeleteLogParams {
  logId: string;
  userId: string;
  source: LogSource;
}

export interface ApplyGapChainParams {
  logId: string;
  userId: string;
  lastLogEndedAt: Date;
  mode: 'chain' | 'skip' | 'duration';
  durationMinutes?: number; // Required for 'duration' mode
}

export interface FinalizeQuickTaskParams {
  logId: string;
  userId: string;
}

/**
 * Create a task (with time tracking)
 * Caller provides explicit startedAt and endedAt - helper calculates duration if not provided
 */
export async function createTask(params: CreateTaskParams): Promise<Log> {
  const { userId, text, startedAt, endedAt, duration, status, source } = params;
  
  // Calculate duration if not provided
  const calculatedDuration = duration ?? Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 60000
  );
  
  // Default status
  const finalStatus = status ?? 'COMPLETED';
  
  const log = await prisma.log.create({
    data: {
      userId,
      content: { note: text },
      startedAt,
      endedAt,
      duration: calculatedDuration,
      status: finalStatus,
    },
  });
  
  // Log operation for future ledger (console.log for now)
  console.log(`[LogOps] CREATE_TASK: userId=${userId}, logId=${log.id}, source=${source}, status=${finalStatus}`);
  
  return log;
}

/**
 * Create a note (no time tracking)
 */
export async function createNote(params: CreateNoteParams): Promise<Log> {
  const { userId, text, source } = params;
  
  const log = await prisma.log.create({
    data: {
      userId,
      content: { note: text },
      endedAt: null,
      duration: null,
      status: 'COMPLETED',
    },
  });
  
  console.log(`[LogOps] CREATE_NOTE: userId=${userId}, logId=${log.id}, source=${source}`);
  
  return log;
}

/**
 * Update log content (note text)
 */
export async function updateLogContent(params: UpdateLogContentParams): Promise<Log> {
  const { logId, userId, newContent } = params;
  
  // Ownership check
  const existing = await prisma.log.findUnique({
    where: { id: logId, userId },
  });
  
  if (!existing) {
    throw new Error('Log not found or unauthorized');
  }
  
  const log = await prisma.log.update({
    where: { id: logId },
    data: {
      content: {
        ...newContent,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  
  console.log(`[LogOps] UPDATE_LOG_CONTENT: userId=${userId}, logId=${logId}`);
  
  return log;
}

/**
 * Update log time fields
 * Caller provides what they want to change - helper calculates duration if needed
 */
export async function updateLogTimes(params: UpdateLogTimesParams): Promise<Log> {
  const { logId, userId, startedAt, endedAt, duration } = params;
  
  // Ownership check
  const existing = await prisma.log.findUnique({
    where: { id: logId, userId },
  });
  
  if (!existing) {
    throw new Error('Log not found or unauthorized');
  }
  
  // Build update data
  const updateData: any = {};
  
  if (startedAt !== undefined) updateData.startedAt = startedAt;
  if (endedAt !== undefined) updateData.endedAt = endedAt;
  
  // Calculate duration if both times are provided and duration not explicitly set
  if (startedAt !== undefined && endedAt !== undefined && duration === undefined) {
    updateData.duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  } else if (duration !== undefined) {
    updateData.duration = duration;
  }
  
  const log = await prisma.log.update({
    where: { id: logId },
    data: updateData,
  });
  
  console.log(`[LogOps] UPDATE_LOG_TIMES: userId=${userId}, logId=${logId}`);
  
  return log;
}

/**
 * Delete a log (with ownership check)
 */
export async function deleteLog(params: DeleteLogParams): Promise<void> {
  const { logId, userId, source } = params;
  
  const result = await prisma.log.deleteMany({
    where: {
      id: logId,
      userId, // Ownership check
    },
  });
  
  if (result.count === 0) {
    throw new Error('Log not found or unauthorized');
  }
  
  console.log(`[LogOps] DELETE_LOG: userId=${userId}, logId=${logId}, source=${source}`);
}

/**
 * Apply gap chain operation (chain/skip/duration)
 */
export async function applyGapChain(params: ApplyGapChainParams): Promise<Log> {
  const { logId, userId, lastLogEndedAt, mode, durationMinutes } = params;
  
  // Ownership check
  const existing = await prisma.log.findUnique({
    where: { id: logId, userId },
  });
  
  if (!existing) {
    throw new Error('Log not found or unauthorized');
  }
  
  if (!existing.endedAt) {
    throw new Error('Cannot apply gap chain to a log without endedAt');
  }
  
  const updateData: any = {
    telegramChallengeId: null,
    telegramChallengeType: null,
    status: 'COMPLETED',
  };
  
  if (mode === 'chain') {
    // Chain to previous task
    updateData.startedAt = lastLogEndedAt;
    updateData.duration = Math.round(
      (existing.endedAt.getTime() - lastLogEndedAt.getTime()) / 60000
    );
    console.log(`[LogOps] GAP_CHAIN: userId=${userId}, logId=${logId}, duration=${updateData.duration}m`);
  } else if (mode === 'skip') {
    // Quick task (duration 0)
    updateData.duration = 0;
    console.log(`[LogOps] GAP_SKIP: userId=${userId}, logId=${logId}`);
  } else if (mode === 'duration') {
    // User specified duration
    if (durationMinutes === undefined) {
      throw new Error('durationMinutes required for duration mode');
    }
    updateData.startedAt = new Date(existing.endedAt.getTime() - durationMinutes * 60000);
    updateData.duration = durationMinutes;
    console.log(`[LogOps] GAP_DURATION_SET: userId=${userId}, logId=${logId}, duration=${durationMinutes}m`);
  }
  
  const log = await prisma.log.update({
    where: { id: logId },
    data: updateData,
  });
  
  return log;
}

/**
 * Finalize a stale log as a quick task (duration 0)
 */
export async function finalizeQuickTask(params: FinalizeQuickTaskParams): Promise<Log> {
  const { logId, userId } = params;
  
  // Ownership check
  const existing = await prisma.log.findUnique({
    where: { id: logId, userId },
  });
  
  if (!existing) {
    throw new Error('Log not found or unauthorized');
  }
  
  const log = await prisma.log.update({
    where: { id: logId },
    data: {
      telegramChallengeId: null,
      telegramChallengeType: null,
      status: 'COMPLETED',
      duration: 0,
    },
  });
  
  console.log(`[LogOps] FINALIZE_STALE_TO_QUICK: userId=${userId}, logId=${logId}`);
  
  return log;
}
