'use client';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Clock, Loader2, Check, X, Pencil } from 'lucide-react';
import { Log } from '@/app/generated/prisma/client';
import DeleteButton from './delete-button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { updateLog } from '../actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface LogCardProps {
  log: any;
  onDelete: () => void; // <--- Receive the function
}

const formatDate = (dateString: string | Date) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function LogCard({ log, onDelete }: LogCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialContent =
    typeof log.content === 'string' ? log.content : log.content?.note || '';

  const [editedContent, setEditedContent] = useState(initialContent);

  const handleCreateDeleteSequence = () => {
    // 1. Trigger the visual exit
    setIsExiting(true);

    // 2. Notify the parent to remove data (Parent will wait 500ms matching our duration)
    onDelete();
  };

  const handleSave = async () => {
    setIsLoading(true);
    const result = await updateLog(log.id, editedContent);
    setIsLoading(false);

    if (result.success) {
      setIsEditing(false);
      // The content will update automatically via revalidatePath -> parent prop update
    } else {
      alert(result.message);
    }
  };
  return (
    <Card
      className={cn(
        // Base Transition: Smooth movement for all properties
        'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',

        // EXIT STATE:
        // 1. Slide Right (translate-x-full)
        // 2. Fade Out (opacity-0)
        // 3. Turn Red (bg-red-500/10) - Optional dramatic flair
        isExiting
          ? 'translate-x-full opacity-0 bg-destructive/10 border-destructive'
          : 'translate-x-0 opacity-100 hover:bg-muted/50',
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <div className='flex items-center gap-2'>
          <div className='rounded-md bg-primary/10 p-2 text-primary'>
            <Terminal className='h-4 w-4' />
          </div>
          <CardTitle className='text-sm font-medium leading-none'>
            System Log
          </CardTitle>
        </div>
        <div className='flex items-center gap-3'>
          <Badge
            variant='outline'
            className='flex items-center gap-1 font-mono text-xs font-normal text-muted-foreground'
          >
            <Clock className='h-3 w-3' />
            {formatDate(log.createdAt)}
          </Badge>

          {!isEditing && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          <DeleteButton
            onDelete={handleCreateDeleteSequence}
            isLoading={isExiting}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          // --- EDIT MODE ---
          <div className='flex flex-col gap-2 mt-2'>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className='font-mono text-xs bg-background min-h-[100px]'
            />
            <div className='flex justify-end gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(initialContent); // Reset on cancel
                }}
                disabled={isLoading}
              >
        
                <X className='h-3 w-3 mr-1' /> Cancel
              </Button>
              <Button size='sm' onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <Check className='h-3 w-3 mr-1' />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* The Content: Monospace font for that 'hacker' vibe */}
            <pre className='mt-2 w-full overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-50'>
              {initialContent}
            </pre>

            {/* Footer ID (Subtle) */}
            <div className='mt-2 text-[10px] text-muted-foreground uppercase tracking-widest'>
              ID: {log.id}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
