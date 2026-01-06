'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={handleSync}
      disabled={isLoading}
      className='mt-2 text-xs h-8 text-muted-foreground'
    >
      <RefreshCw
        className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
      />
      {isLoading ? 'Syncing...' : 'Repair Connection'}
    </Button>
  );
}
