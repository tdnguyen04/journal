'use client';

import { Log } from '@/app/generated/prisma/browser';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format, differenceInMinutes, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimelineViewProps {
  logs: Log[];
}

export function TimelineView({ logs }: TimelineViewProps) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  const groupedLogs: { [key: string]: Log[] } = {};
  sortedLogs.forEach((log) => {
    const dateKey = new Date(log.startedAt).toLocaleDateString();
    if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
    groupedLogs[dateKey].push(log);
  });

  return (
    // LAYOUT FIX: Removed 'mx-auto', added 'w-full' to align left
    <div className='w-full max-w-3xl space-y-12 pb-20'>
      {Object.entries(groupedLogs).map(([date, dayLogs]) => (
        <DayGroup key={date} date={date} logs={dayLogs} />
      ))}

      {logs.length === 0 && (
        <div className='text-muted-foreground py-10'>
          No logs yet. Start typing in Telegram!
        </div>
      )}
    </div>
  );
}

function DayGroup({ date, logs }: { date: string; logs: Log[] }) {
  const dateObj = new Date(logs[0].startedAt);
  const title = isSameDay(dateObj, new Date())
    ? 'Today'
    : isSameDay(dateObj, new Date(Date.now() - 86400000))
      ? 'Yesterday'
      : format(dateObj, 'EEEE, MMM d');

  return (
    <div className='relative'>
      <div className='sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-6 border-b w-full'>
        <h3 className='text-lg font-semibold flex items-center gap-2'>
          {title}{' '}
          <span className='text-xs font-normal text-muted-foreground'>
            ({logs.length} blocks)
          </span>
        </h3>
      </div>

      <div className='relative pl-2'>
        {logs.map((log, index) => {
          const previousLog = logs[index + 1];
          let gapMinutes = 0;

          if (previousLog && previousLog.endedAt) {
            const currentStart = new Date(log.startedAt);
            const prevEnd = new Date(previousLog.endedAt);
            gapMinutes = differenceInMinutes(currentStart, prevEnd);
          }

          return (
            <div key={log.id} className='group'>
              <TimelineItem log={log} isLast={index === logs.length - 1} />

              {gapMinutes > 15 && (
                <div className='flex gap-4 my-1 min-h-[40px]'>
                  <div className='w-20 flex-shrink-0' />{' '}
                  {/* Adjusted width for left col */}
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

function TimelineItem({ log, isLast }: { log: Log; isLast: boolean }) {
  const content = (log.content as any)?.note || 'No content';
  const duration = log.duration || 0;

  const isTentative = log.status === 'TENTATIVE';
  const isGapFill = (log as any).isGapFill;

  const startTime = format(new Date(log.startedAt), 'h:mm a');
  // We format the end time here, but we will use it inside the card
  const endTime = log.endedAt ? format(new Date(log.endedAt), 'h:mm a') : null;

  return (
    <div className='flex gap-4 min-h-[80px]'>
      {/* LEFT: Time Column (CLEANED UP) */}
      <div className='w-16 flex-shrink-0 pt-1 text-right'>
        <span className='text-xs font-bold text-foreground block'>
          {startTime}
        </span>
        {/* Removed the End Time from here */}
      </div>

      {/* CENTER: Line & Dot (Unchanged) */}
      <div className='relative w-8 flex justify-center'>
        {!isLast && (
          <div className='absolute top-3 bottom-[-16px] w-0.5 bg-border group-hover:bg-primary/20 transition-colors' />
        )}
        <div
          className={cn(
            'relative z-10 w-3 h-3 rounded-full border-2 mt-1.5 transition-colors bg-background',
            isTentative
              ? 'border-yellow-500 bg-yellow-500/20'
              : 'border-primary',
            isGapFill && 'border-muted-foreground bg-muted',
          )}
        >
          {isTentative && (
            <span className='absolute -right-0.5 -top-0.5 w-full h-full animate-ping rounded-full bg-yellow-400/30 opacity-75'></span>
          )}
        </div>
      </div>

      {/* RIGHT: Content Card */}
      <div className='flex-1 pb-8'>
        <div
          className={cn(
            'p-3 sm:p-4 rounded-xl border shadow-sm transition-all bg-card hover:shadow-md',
            isTentative &&
              'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-800',
          )}
        >
          <div className='flex justify-between items-start gap-3'>
            <div className='flex-1'>
              <p
                className={cn(
                  'font-medium text-sm sm:text-base leading-snug text-card-foreground whitespace-pre-wrap',
                  isTentative && 'text-yellow-900 dark:text-yellow-100',
                )}
              >
                {content}
              </p>

              <div className='flex flex-wrap items-center gap-2 mt-3'>
                {/* DURATION BADGE (With End Time Included) */}
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

                  {/* CHANGE THIS CONDITION: */}
                  {/* Old: {endTime && duration > 0 && ( */}
                  {/* New: Check if start string differs from end string */}
                  {endTime && endTime !== startTime && (
                    <span className='opacity-60 border-l pl-1.5 border-foreground/20'>
                      until {endTime}
                    </span>
                  )}
                </span>

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

            {/* Actions Menu (Unchanged) */}
            <DropdownMenu>{/* ... same dropdown code ... */}</DropdownMenu>

            {isTentative && (
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
  );
}
