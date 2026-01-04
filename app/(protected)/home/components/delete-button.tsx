'use client';

import { deleteLog } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useTransition } from 'react';

interface DeleteButtonProps {
  onDelete: () => void;
  isLoading?: boolean;
}

export default function DeleteButton({
  onDelete,
  isLoading,
}: DeleteButtonProps) {
  return (
    <Button
      variant='ghost'
      size='icon'
      className='h-6 w-6 text-muted-foreground hover:text-destructive transition-colors'
      disabled={isLoading}
      onClick={() => {
        // Confirmation is smart for destructive actions
        if (confirm('Are you sure you want to delete this log?')) {
          onDelete();
        }
      }}
    >
      {isLoading ? (
        <Loader2 className='h-3 w-3 animate-spin' />
      ) : (
        <Trash2 className='h-3 w-3' />
      )}
      <span className='sr-only'>Delete</span>
    </Button>
  );
}
