'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import LogCard from './log-card';
import { Log } from '@/app/generated/prisma/client';
import { useEffect, useMemo, useState } from 'react';
import { deleteLog } from '../actions';
import { isTaskReport } from '@/lib/helpers/log';

interface LogListProps {
  logs: Log[];
  availableTags: string[];
}

/**
 * Find the parent task for a note (if note.createdAt falls within task's time range)
 */
function findParentTask(note: Log, allLogs: Log[]): Log | undefined {
  if (isTaskReport(note)) return undefined;
  
  const noteTime = new Date(note.createdAt).getTime();
  
  return allLogs.find((log) => {
    if (!isTaskReport(log)) return false;
    if (!log.startedAt || !log.endedAt) return false;
    
    const taskStart = new Date(log.startedAt).getTime();
    const taskEnd = new Date(log.endedAt).getTime();
    
    return noteTime >= taskStart && noteTime <= taskEnd;
  });
}

export default function LogList({ logs: initialLogs, availableTags }: LogListProps) {
  // This hook automatically animates any element added or removed from this parent
  const [parent] = useAutoAnimate();

  // 1. Local State for Optimistic Updates
  const [logs, setLogs] = useState(initialLogs);

  // 2. Sync state if the server sends new data (e.g. after adding a log)
  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  // Compute parent task relationships for notes
  const parentTaskMap = useMemo(() => {
    const map = new Map<string, Log>();
    logs.forEach((log) => {
      const parent = findParentTask(log, logs);
      if (parent) {
        map.set(log.id, parent);
      }
    });
    return map;
  }, [logs]);

  // --- 1. THE GROUPING ENGINE ---
  const groupedLogs = useMemo(() => {
    const groups: Record<string, Log[]> = {};

    logs.forEach((log) => {
      // Create a key like "2024-01-20"
      const dateKey = new Date(log.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return groups;
  }, [logs]);

  const getHeaderTitle = (dateKey: string) => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // 3. The Optimistic Handler
  const handleDelete = async (id: string) => {
    // 1. CHOREOGRAPHY: Wait for the card's exit animation (500ms)
    // We don't remove it from 'logs' yet. We let the Card component handle the visual exit.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. OPTIMISTIC UPDATE: Remove from UI instantly after animation
    setLogs((current) => current.filter((log) => log.id !== id));

    // 3. SERVER ACTION: Sync with database in background
    const result = await deleteLog(id);

    // 4. ROLLBACK: If server fails, put it back (Safety Net)
    if (!result.success) {
      alert('Could not delete log.');
      setLogs(initialLogs);
    }
  };

  return (
    <div className='w-full space-y-8'>
      {Object.entries(groupedLogs).map(([dateKey, groupLogs]) => (
        <div key={dateKey} className='relative'>
          {/* STICKY DATE HEADER */}
          <div className='sticky top-0 z-10 py-2 bg-background/95 backdrop-blur-sm border-b mb-4'>
            <h3 className='text-sm font-semibold text-muted-foreground flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-primary/50'></span>
              {getHeaderTitle(dateKey)}
            </h3>
          </div>

          {/* LIST FOR THIS DATE */}
          <div ref={parent} className='flex flex-col gap-4'>
            {groupLogs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onDelete={() => handleDelete(log.id)}
                availableTags={availableTags}
                parentTask={parentTaskMap.get(log.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <div className='text-center p-10 border border-dashed rounded-lg text-muted-foreground'>
          No logs found.
        </div>
      )}
    </div>
  );
}
