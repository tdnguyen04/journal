'use client';

import { useRealtime } from '@/hooks/use-realtime';

export function SettingsListener() {
  useRealtime('user_preferences'); 
  return null;
}