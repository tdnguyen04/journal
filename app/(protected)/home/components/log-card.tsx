'use client';

import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Loader2,
  Check,
  X,
  Pencil,
  Sparkles,
  FileText,
  Brain,
  EyeOff,
  Eye,
  Tag as TagIcon,
  Plus,
  MoreHorizontal,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { Log } from '@/app/generated/prisma/client';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { analyzeLog, toggleLogTag, updateLog, deleteLog } from '../actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { Analysis } from '@/lib/validations/analysis';
import { AnalysisView } from './analysis-view';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface LogCardProps {
  log: any;
  onDelete: () => void;
  availableTags: string[];
  parentTask?: any; // Task that this note was created during
}

/**
 * Detect if log is a Task (has time tracking from Telegram)
 * Notes created via browser or /note command have no startedAt
 */
function isTaskReport(log: any): boolean {
  return log.startedAt !== null;
}

export default function LogCard({
  log,
  onDelete,
  availableTags,
  parentTask,
}: LogCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!log.isRedacted);

  const initialContent =
    typeof log.content === 'string' ? log.content : log.content?.note || '';
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [editedContent, setEditedContent] = useState(initialContent);

  const analysisData = (log.content as any)?.analysis as Analysis | undefined;

  useEffect(() => {
    setDisplayContent(initialContent);
    setEditedContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    setIsLoading(true);
    const result = await updateLog(log.id, editedContent);
    if (result.success) {
      setDisplayContent(editedContent);
      setIsEditing(false);
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLog(log.id);
    setIsAnalyzing(false);
    if (!result.success) toast.error(result.message);
  };

  const handleDelete = async () => {
    setIsExiting(true);
    await onDelete();
  };

  const formatTime = (date: string | Date) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatTimeOnly = (date: string | Date) =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

  // Edit mode - full width textarea
  if (isEditing) {
    return (
      <div
        className={cn(
          'group relative rounded-lg border bg-card p-3 transition-all',
          'animate-in fade-in duration-200',
        )}
      >
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className='font-mono text-sm bg-background min-h-[80px] mb-2'
          autoFocus
        />
        <div className='flex justify-end gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setIsEditing(false);
              setEditedContent(displayContent);
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
    );
  }

  // Analysis view
  if (showAnalysis && analysisData) {
    return (
      <div
        className={cn(
          'group relative rounded-lg border bg-card p-3 transition-all',
          'animate-in fade-in duration-200',
        )}
      >
        <div className='flex items-center justify-between mb-2'>
          <span className='text-xs text-muted-foreground'>AI Analysis</span>
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2'
            onClick={() => setShowAnalysis(false)}
          >
            <FileText className='h-3 w-3 mr-1' /> Back
          </Button>
        </div>
        <AnalysisView analysis={analysisData} />
      </div>
    );
  }

  // Normal compact view
  const isTask = isTaskReport(log);
  
  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all duration-300 overflow-hidden',
        // Task vs Note visual distinction
        isTask 
          ? 'bg-primary/[0.03] border-primary/20' 
          : 'bg-card border-border',
        // Exit animation - scale down + fade instead of translate (avoids horizontal scroll)
        isExiting && 'scale-95 opacity-0 bg-destructive/10 border-destructive',
        !isExiting && 'hover:shadow-sm',
        'animate-in fade-in slide-in-from-top-2 duration-300',
      )}
    >
      {/* Left accent bar for tasks */}
      {isTask && (
        <div className='absolute left-0 top-0 bottom-0 w-1 bg-primary/60' />
      )}
      
      {/* Main row - timestamp + content + actions */}
      <div className={cn('flex items-stretch p-3', isTask && 'pl-4')}>
        {/* Timestamp column - fixed width, right-aligned */}
        <div className='w-28 flex-shrink-0 text-right pr-4 flex flex-col justify-start pt-0.5'>
          {isTask && log.startedAt && log.endedAt ? (
            /* Task: Show time range */
            <>
              <span className='text-xs text-muted-foreground whitespace-nowrap'>
                {formatTimeOnly(log.startedAt)}
              </span>
              <div className='flex items-center justify-end gap-1 text-[10px] text-primary/70'>
                <span>→ {formatTimeOnly(log.endedAt)}</span>
              </div>
            </>
          ) : (
            /* Note: Show time only (date is in group header) */
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              {formatTimeOnly(log.createdAt)}
            </span>
          )}
        </div>

        {/* Vertical separator */}
        <div className='w-px bg-border mr-4 flex-shrink-0' />

        {/* Content - grows to fill space */}
        <div className='flex-1 min-w-0'>
          {/* Redacted content */}
          {log.isRedacted && !isRevealed ? (
            <div
              className='cursor-pointer select-none'
              onClick={() => setIsRevealed(true)}
            >
              <div className='blur-[4px] text-sm'>
                {displayContent.slice(0, 50)}...
              </div>
              <span className='text-[10px] text-muted-foreground'>
                Click to reveal
              </span>
            </div>
          ) : (
            /* Normal content */
            <div className='text-sm prose prose-neutral dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-normal'>
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
          )}

          {/* "During task" indicator for notes */}
          {parentTask && (
            <div className='flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground'>
              <Paperclip className='w-3 h-3' />
              <span>
                During:{' '}
                <span className='font-medium text-foreground/70'>
                  {((parentTask.content as any)?.note || 'task').slice(0, 30)}
                  {((parentTask.content as any)?.note || '').length > 30 ? '...' : ''}
                </span>
              </span>
            </div>
          )}

          {/* Tags row - only if has tags */}
          {(log.tagValues?.length > 0) && (
            <div className='flex flex-wrap items-center gap-1 mt-2'>
              {log.tagValues.map((tag: string) => (
                <span
                  key={tag}
                  className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions - visible on hover */}
        <div className='flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
          {/* Quick tag add */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7'>
                <TagIcon className='h-3.5 w-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-32'>
              {availableTags.map((tag) => {
                const isSelected = log.tagValues?.includes(tag);
                return (
                  <DropdownMenuItem
                    key={tag}
                    onClick={async () => {
                      const result = await toggleLogTag(log.id, tag);
                      if (!result.success) toast.error('Failed to update tag');
                    }}
                    className='text-xs'
                  >
                    {isSelected ? '✓ ' : ''}{tag}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7'>
                <MoreHorizontal className='h-3.5 w-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-36'>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className='h-3 w-3 mr-2' /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                <Sparkles className={cn('h-3 w-3 mr-2', isAnalyzing && 'animate-spin')} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </DropdownMenuItem>
              {analysisData && (
                <DropdownMenuItem onClick={() => setShowAnalysis(true)}>
                  <Brain className='h-3 w-3 mr-2' /> View Analysis
                </DropdownMenuItem>
              )}
              {log.isRedacted && (
                <DropdownMenuItem onClick={() => setIsRevealed(!isRevealed)}>
                  {isRevealed ? (
                    <><EyeOff className='h-3 w-3 mr-2' /> Hide</>
                  ) : (
                    <><Eye className='h-3 w-3 mr-2' /> Reveal</>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className='text-destructive focus:text-destructive'
              >
                <Trash2 className='h-3 w-3 mr-2' /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
