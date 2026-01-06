'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Your client-side supabase helper
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useRealtime(table: 'logs' | 'user_preferences') {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Subscribe to the table
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        (payload) => {
          // 2. When a change happens, "Soft Refresh" the server components
          console.log(`⚡ Realtime change detected on ${table}:`, payload);
          console.log(payload.eventType);
          if (payload.eventType === 'INSERT') {
            toast.success('New entry received via Telegram');
          }
          router.refresh();
        },
      )
      .subscribe();

    // 3. Cleanup when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, table]);
}
