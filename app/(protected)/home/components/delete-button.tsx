'use client';

import { deleteLog } from '../actions';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';

interface DeleteButtonProps {
  onDelete: () => void;
}

export default function DeleteButton({ onDelete }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
      disabled={isPending}
      onClick={() => {
        // Confirmation is smart for destructive actions
        if (confirm('Are you sure you want to delete this log?')) {
          onDelete();
        }
      }}
    >
      {/* Visual feedback: simple opacity change or spinner */}
      <Trash2 className={`h-3 w-3 ${isPending ? 'opacity-50' : ''}`} />
      <span className="sr-only">Delete</span>
    </Button>
  );
}