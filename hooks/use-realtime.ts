'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Your client-side supabase helper
import { useRouter } from 'next/navigation';

export function useRealtime(table: 'logs' | 'user_preferences') {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Subscribe to the table
    const channel = supabase
      .channel('realtime-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        (payload) => {
          // 2. When a change happens, "Soft Refresh" the server components
          console.log('⚡ Realtime change detected:', payload);
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
