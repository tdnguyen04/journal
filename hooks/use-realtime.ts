'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Check if we should use polling (local dev without Supabase realtime)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const FORCE_POLLING = process.env.NEXT_PUBLIC_USE_POLLING === 'true';
const USE_POLLING = FORCE_POLLING || !SUPABASE_URL || SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1');
const POLLING_INTERVAL = 5000; // 5 seconds

export function useRealtime(table: 'logs' | 'user_preferences') {
  const router = useRouter();
  const supabase = createClient();
  const hasShownToast = useRef(false);

  useEffect(() => {
    // --- POLLING MODE (local dev) ---
    if (USE_POLLING) {
      console.log(`📡 Using polling for ${table} (local dev mode)`);
      
      const interval = setInterval(() => {
        router.refresh();
      }, POLLING_INTERVAL);

      return () => clearInterval(interval);
    }

    // --- SUPABASE REALTIME MODE (production) ---
    console.log(`⚡ Using Supabase realtime for ${table}`);
    
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`⚡ Realtime change detected on ${table}:`, payload);
          if (payload.eventType === 'INSERT' && !hasShownToast.current) {
            toast.success('New entry received via Telegram');
            hasShownToast.current = true;
            // Reset after 2 seconds to allow future toasts
            setTimeout(() => { hasShownToast.current = false; }, 2000);
          }
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, table]);
}
