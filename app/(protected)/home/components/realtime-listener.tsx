'use client';

import { useRealtime } from '@/hooks/use-realtime';

export function RealtimeLogListener() {
  useRealtime('logs'); // Listen for new logs
  return null; // It renders nothing visually
}