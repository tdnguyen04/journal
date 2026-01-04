'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import LogCard from './log-card';
import { Log } from '@/app/generated/prisma/client';
import { useEffect, useState } from 'react';
import { deleteLog } from '../actions';

export default function LogList({ logs: initialLogs }: { logs: Log[] }) {
  // This hook automatically animates any element added or removed from this parent
  const [parent] = useAutoAnimate();

  // 1. Local State for Optimistic Updates
  const [logs, setLogs] = useState(initialLogs);

  // 2. Sync state if the server sends new data (e.g. after adding a log)
  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

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
      alert("Could not delete log.");
      setLogs(initialLogs); 
    }
  };

  return (
    <div ref={parent} className='flex flex-col gap-4 w-full'>
      {logs.map((log) => (
        // We ensure date is a string to satisfy serialization if needed,
        // though passing the object directly often works if types align.
        <LogCard key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
      ))}
    </div>
  );
}
