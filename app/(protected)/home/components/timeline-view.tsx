'use client';

import { Log } from '@/app/generated/prisma/browser';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  MoreHorizontal,
  MessageSquare,
  CornerDownRight,
} from 'lucide-react';
import { format, differenceInMinutes, isSameDay } from 'date-fns';

interface TimelineViewProps {
  logs: Log[];
}

// Extended log type with computed parent task relationship
interface LogWithParent extends Log {
  parentTask?: Log;
}

// =============================================================================
// HELPERS: Log Type Detection
// =============================================================================

/**
 * Task Reports have duration (from Telegram time-blocking flow)
 * Fleeting Thoughts have no duration (quick web entries)
 */
function isTaskReport(log: Log): boolean {
  return log.duration !== null && log.duration > 0;
}

/**
 * Get the primary display time for a log
 * Task Reports: use startedAt (when the task began)
 * Fleeting Thoughts: use createdAt (when the thought was captured)
 */
function getDisplayTime(log: Log): Date {
  if (isTaskReport(log) && log.startedAt) {
    return new Date(log.startedAt);
  }
  return new Date(log.createdAt);
}

/**
 * Get the end time for gap calculations (only meaningful for Task Reports)
 */
function getEndTime(log: Log): Date | null {
  if (isTaskReport(log) && log.endedAt) {
    return new Date(log.endedAt);
  }
  return null;
}

/**
 * Find the parent task for a note (if note.createdAt falls within task's time range)
 */
function findParentTask(note: Log, allLogs: Log[]): Log | undefined {
  if (isTaskReport(note)) return undefined; // Only notes can have parents
  
  const noteTime = new Date(note.createdAt).getTime();
  
  return allLogs.find((log) => {
    if (!isTaskReport(log)) return false;
    if (!log.startedAt || !log.endedAt) return false;
    
    const taskStart = new Date(log.startedAt).getTime();
    const taskEnd = new Date(log.endedAt).getTime();
    
    return noteTime >= taskStart && noteTime <= taskEnd;
  });
}

/**
 * Compute parent relationships for all notes
 */
function computeParentRelationships(logs: Log[]): Map<string, Log> {
  const parentMap = new Map<string, Log>();
  
  logs.forEach((log) => {
    if (!isTaskReport(log)) {
      const parent = findParentTask(log, logs);
      if (parent) {
        parentMap.set(log.id, parent);
      }
    }
  });
  
  return parentMap;
}

export function TimelineView({ logs }: TimelineViewProps) {
  // Compute parent relationships
  const parentMap = computeParentRelationships(logs);
  
  // Get IDs of notes that have parents (will be rendered under their tasks)
  const nestedNoteIds = new Set(parentMap.keys());
  
  // Sort by display time (handles both Task Reports and Fleeting Thoughts)
  // Filter out nested notes - they'll be rendered under their parent tasks
  const sortedLogs = [...logs]
    .filter((log) => !nestedNoteIds.has(log.id))
    .sort((a, b) => getDisplayTime(b).getTime() - getDisplayTime(a).getTime());

  // Get nested notes for each task
  const getNestedNotes = (taskId: string): Log[] => {
    return logs
      .filter((log) => parentMap.get(log.id)?.id === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  // Group by date using display time
  const groupedLogs: { [key: string]: Log[] } = {};
  sortedLogs.forEach((log) => {
    const dateKey = getDisplayTime(log).toLocaleDateString();
    if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
    groupedLogs[dateKey].push(log);
  });

  return (
    <div className='w-full max-w-3xl space-y-12 pb-20'>
      {Object.entries(groupedLogs).map(([date, dayLogs]) => (
        <DayGroup key={date} date={date} logs={dayLogs} getNestedNotes={getNestedNotes} />
      ))}

      {logs.length === 0 && (
        <div className='text-muted-foreground py-10'>
          No logs yet. Start typing in Telegram!
        </div>
      )}
    </div>
  );
}

function DayGroup({ 
  date, 
  logs, 
  getNestedNotes 
}: { 
  date: string; 
  logs: Log[]; 
  getNestedNotes: (taskId: string) => Log[];
}) {
  // Use helper for consistent date handling
  const dateObj = getDisplayTime(logs[0]);
  const title = isSameDay(dateObj, new Date())
    ? 'Today'
    : isSameDay(dateObj, new Date(Date.now() - 86400000))
      ? 'Yesterday'
      : format(dateObj, 'EEEE, MMM d');

  // Count task reports vs fleeting thoughts for the header
  const taskCount = logs.filter(isTaskReport).length;
  const thoughtCount = logs.length - taskCount;

  return (
    <div className='relative'>
      <div className='sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-6 border-b w-full'>
        <h3 className='text-lg font-semibold flex items-center gap-2'>
          {title}{' '}
          <span className='text-xs font-normal text-muted-foreground'>
            ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})
          </span>
        </h3>
      </div>

      <div className='relative pl-2'>
        {logs.map((log, index) => {
          const previousLog = logs[index + 1];
          let gapMinutes = 0;
          const nestedNotes = isTaskReport(log) ? getNestedNotes(log.id) : [];

          // Only calculate gaps between Task Reports (not Fleeting Thoughts)
          // Fleeting Thoughts are point-in-time, not time blocks
          if (
            isTaskReport(log) &&
            previousLog &&
            isTaskReport(previousLog)
          ) {
            const currentStart = getDisplayTime(log);
            const prevEnd = getEndTime(previousLog);
            if (prevEnd) {
              gapMinutes = differenceInMinutes(currentStart, prevEnd);
            }
          }

          return (
            <div key={log.id} className='group'>
              <TimelineItem 
                log={log} 
                isLast={index === logs.length - 1 && nestedNotes.length === 0} 
                nestedNotes={nestedNotes}
              />

              {gapMinutes > 5 && (
                <div className='flex gap-4 my-1 min-h-[40px]'>
                  <div className='w-20 flex-shrink-0' />
                  <div className='relative w-8 flex justify-center'>
                    <div className='w-0.5 h-full border-l-2 border-dashed border-muted-foreground/30' />
                  </div>
                  <div className='flex-1 pt-2 pb-4'>
                    <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground'>
                      <MoreHorizontal className='w-3 h-3' />
                      {Math.floor(gapMinutes / 60) > 0
                        ? `${Math.floor(gapMinutes / 60)}h ${gapMinutes % 60}m`
                        : `${gapMinutes}m`}{' '}
                      untracked
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineItem({ 
  log, 
  isLast,
  nestedNotes = []
}: { 
  log: Log; 
  isLast: boolean;
  nestedNotes?: Log[];
}) {
  const content = (log.content as any)?.note || 'No content';
  const isTask = isTaskReport(log);
  const duration = log.duration || 0;
  const hasNestedNotes = nestedNotes.length > 0;

  const isTentative = log.status === 'TENTATIVE';
  const isGapFill = (log as any).isGapFill;

  // Use helper for consistent time display
  const displayTime = getDisplayTime(log);
  const formattedTime = format(displayTime, 'h:mm a');
  
  // End time only relevant for Task Reports
  const endTime = isTask && log.endedAt 
    ? format(new Date(log.endedAt), 'h:mm a') 
    : null;

  return (
    <>
      <div className='flex gap-4 min-h-[80px]'>
        {/* LEFT: Time Column */}
        <div className='w-16 flex-shrink-0 pt-1 text-right'>
          <span className='text-xs font-bold text-foreground block'>
            {formattedTime}
          </span>
        </div>

        {/* CENTER: Line & Dot */}
        <div className='relative w-8 flex justify-center'>
          {(!isLast || hasNestedNotes) && (
            <div className='absolute top-3 bottom-[-16px] w-0.5 bg-border group-hover:bg-primary/20 transition-colors' />
          )}
          <div
            className={cn(
              'relative z-10 w-3 h-3 rounded-full border-2 mt-1.5 transition-colors bg-background',
              // Fleeting Thoughts get a different style (lighter, smaller feel)
              !isTask && 'border-muted-foreground/50',
              // Task Reports: normal primary or tentative yellow
              isTask && !isTentative && 'border-primary',
              isTask && isTentative && 'border-yellow-500 bg-yellow-500/20',
              isGapFill && 'border-muted-foreground bg-muted',
            )}
          >
            {isTentative && isTask && (
              <span className='absolute -right-0.5 -top-0.5 w-full h-full animate-ping rounded-full bg-yellow-400/30 opacity-75'></span>
            )}
          </div>
        </div>

        {/* RIGHT: Content Card */}
        <div className={cn('flex-1', hasNestedNotes ? 'pb-2' : 'pb-8')}>
          <div
            className={cn(
              'p-3 sm:p-4 rounded-xl border shadow-sm transition-all bg-card hover:shadow-md',
              // Fleeting Thoughts: subtle dashed border to differentiate
              !isTask && 'border-dashed border-muted-foreground/30',
              // Task Reports with tentative status
              isTask && isTentative &&
                'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-800',
            )}
          >
            <div className='flex justify-between items-start gap-3'>
              <div className='flex-1'>
                {/* Fleeting Thought indicator */}
                {!isTask && (
                  <div className='flex items-center gap-1 mb-1'>
                    <MessageSquare className='w-3 h-3 text-muted-foreground' />
                    <span className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                      Note
                    </span>
                  </div>
                )}
                
                <p
                  className={cn(
                    'font-medium text-sm sm:text-base leading-snug text-card-foreground whitespace-pre-wrap',
                    isTentative && isTask && 'text-yellow-900 dark:text-yellow-100',
                  )}
                >
                  {content}
                </p>

                <div className='flex flex-wrap items-center gap-2 mt-3'>
                  {/* DURATION BADGE - Only show for Task Reports */}
                  {isTask && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium border',
                        isTentative
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-secondary/50 text-secondary-foreground border-transparent',
                      )}
                    >
                      <Clock className='w-3 h-3' />
                      <span>{duration > 0 ? `${duration}m` : '< 1m'}</span>

                      {endTime && endTime !== formattedTime && (
                        <span className='opacity-60 border-l pl-1.5 border-foreground/20'>
                          until {endTime}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Tags - shown for both types */}
                  {log.tagValues &&
                    log.tagValues.length > 0 &&
                    log.tagValues.map((tag) => (
                      <span
                        key={tag}
                        className='text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md'
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* Tentative Warning - Only for Task Reports */}
              {isTentative && isTask && (
                <div
                  className='text-yellow-600 dark:text-yellow-500 flex-shrink-0'
                  title='Unconfirmed time'
                >
                  <AlertCircle className='w-5 h-5' />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Notes - shown indented under parent task */}
      {hasNestedNotes && (
        <div className='ml-24 pl-4 border-l-2 border-primary/20 mb-6'>
          {nestedNotes.map((note, idx) => (
            <NestedNoteItem 
              key={note.id} 
              note={note} 
              isLast={idx === nestedNotes.length - 1} 
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Compact note item for nested display */
function NestedNoteItem({ note, isLast }: { note: Log; isLast: boolean }) {
  const content = (note.content as any)?.note || 'No content';
  const noteTime = format(new Date(note.createdAt), 'h:mm a');

  return (
    <div className={cn('flex items-start gap-2 py-2', !isLast && 'border-b border-border/50')}>
      <CornerDownRight className='w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0' />
      <div className='flex-1 min-w-0'>
        <p className='text-sm text-card-foreground whitespace-pre-wrap'>{content}</p>
        <span className='text-[10px] text-muted-foreground'>{noteTime}</span>
      </div>
    </div>
  );
}
