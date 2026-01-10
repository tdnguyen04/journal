import { Log } from '@/app/generated/prisma/client';
import { Analysis } from '@/lib/validations/analysis';

/**
 * Structure of the JSON content field in Log
 */
export interface LogContent {
  note: string;
  timestamp?: string;
  updatedAt?: string;
  analysis?: Analysis;
}

/**
 * Extract the note text from a log's content field
 * Handles both string and object formats
 */
export function getLogNote(log: Log): string {
  if (typeof log.content === 'string') return log.content;
  return (log.content as unknown as LogContent)?.note || '';
}

/**
 * Determine if a log is a Task (has time tracking) vs a Note (fleeting thought)
 * 
 * Tasks are created via Telegram text messages and have:
 * - startedAt: when the task began
 * - endedAt: when the task was logged (always set for tasks)
 * - duration: calculated time in minutes
 * 
 * Notes are created via:
 * - Browser "Log your progress..." dialog
 * - Telegram /note command
 * Notes have NO time tracking fields (startedAt, endedAt, duration are null)
 * 
 * We check endedAt because:
 * - Old notes have startedAt set (Prisma default) but endedAt is null
 * - New notes have all time fields null
 * - Tasks ALWAYS have endedAt set
 */
export function isTaskReport(log: Log): boolean {
  return log.endedAt !== null;
}

/**
 * Get the primary display time for a log
 * Task Reports: use startedAt (when the task began)
 * Fleeting Thoughts: use createdAt (when the thought was captured)
 */
export function getDisplayTime(log: Log): Date {
  if (isTaskReport(log) && log.startedAt) {
    return new Date(log.startedAt);
  }
  return new Date(log.createdAt);
}

/**
 * Get the end time for gap calculations (only meaningful for Task Reports)
 */
export function getEndTime(log: Log): Date | null {
  if (isTaskReport(log) && log.endedAt) {
    return new Date(log.endedAt);
  }
  return null;
}
