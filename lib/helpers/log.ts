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
  return (log.content as LogContent)?.note || '';
}

/**
 * Task Reports have duration (from Telegram time-blocking flow)
 * Fleeting Thoughts have no duration (quick web entries)
 */
export function isTaskReport(log: Log): boolean {
  return log.duration !== null && log.duration > 0;
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
