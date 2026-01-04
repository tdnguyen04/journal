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
    // A. INSTANTLY remove from UI (Trigger Animation)
    setLogs((current) => current.filter((log) => log.id !== id));

    // B. Tell Server to delete (Background)
    const result = await deleteLog(id);

    // C. Rollback if server fails (Optional safety)
    if (!result.success) {
      alert('Failed to delete');
      setLogs(initialLogs); // Revert
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
