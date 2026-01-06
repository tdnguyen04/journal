'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function TelegramDebugButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      // No prompt needed! The API handles the logic now.
      const res = await fetch('/api/telegram/setup');
      const data = await res.json();

      if (data.success) {
        toast.success('Connection Refreshed', {
          description: data.message,
        });
      } else {
        toast.error('Connection Failed', {
          description: data.message,
        });
      }
    } catch (e) {
      toast.error('Network Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHardReset = async () => {
    if (
      !confirm(
        'This will purge all stuck messages and force-reset the Telegram connection. Continue?',
      )
    )
      return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/telegram/setup', { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Reset Complete', { description: data.message });
      } else {
        toast.error('Reset Failed', { description: data.message });
      }
    } catch (e) {
      toast.error('Network Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col gap-2 mt-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleSync}
        disabled={isLoading}
        className='text-xs h-8 text-muted-foreground w-full justify-start'
      >
        <RefreshCw
          className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
        />
        {isLoading ? 'Updating...' : 'Update Webhook URL'}
      </Button>

      <Button
        variant='destructive'
        size='sm'
        onClick={handleHardReset}
        disabled={isLoading}
        className='text-xs h-8 w-full justify-start opacity-80 hover:opacity-100'
      >
        <Trash2 className='mr-2 h-3 w-3' />
        Hard Reset (Purge & Reconnect)
      </Button>
    </div>
  );
}
