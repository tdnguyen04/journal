'use client';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Terminal,
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
} from 'lucide-react';
import { Log } from '@/app/generated/prisma/client';
import DeleteButton from './delete-button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { analyzeLog, toggleLogTag, updateLog } from '../actions';
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
} from '@/components/ui/dropdown-menu';

interface LogCardProps {
  log: any;
  onDelete: () => void; // <--- Receive the function
  availableTags: string[];
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

export default function LogCard({
  log,
  onDelete,
  availableTags,
}: LogCardProps) {
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLog(log.id);
    setIsAnalyzing(false);

    if (!result.success) {
      alert(result.message); // Or use toast
    }
  };

  const [showAnalysis, setShowAnalysis] = useState(false);

  // Helper to safely check if analysis exists
  const analysisData = (log.content as any)?.analysis as Analysis | undefined;
  const hasAnalysis = !!analysisData;

  const [isRevealed, setIsRevealed] = useState(!log.isRedacted);

  const handleTagToggle = async (tag: string) => {
    // Optimistic UI could go here, but for now we'll wait for server
    const result = await toggleLogTag(log.id, tag);
    if (!result.success) {
      // alert or toast error
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

        'animate-in fade-in slide-in-from-top-4 duration-500',
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
          {log.isRedacted && (
            <Badge
              variant='secondary'
              className='text-[10px] h-5 px-1.5 font-mono uppercase tracking-wider'
            >
              Redacted
            </Badge>
          )}
          <Badge
            variant='outline'
            className='flex items-center gap-1 font-mono text-xs font-normal text-muted-foreground'
          >
            <Clock className='h-3 w-3' />
            {formatDate(log.createdAt)}
          </Badge>

          {log.isRedacted && (
            <Button
              variant='ghost'
              size='icon'
              className={`h-6 w-6 ${isRevealed ? 'text-muted-foreground' : 'text-primary'}`}
              onClick={() => setIsRevealed(!isRevealed)}
              title={isRevealed ? 'Hide content' : 'Reveal content'}
            >
              {isRevealed ? (
                <EyeOff className='h-3 w-3' />
              ) : (
                <Eye className='h-3 w-3' />
              )}
            </Button>
          )}

          {hasAnalysis && (
            <Button
              variant='ghost'
              size='icon'
              className={`h-6 w-6 ${showAnalysis ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setShowAnalysis(!showAnalysis)}
              title={showAnalysis ? 'View Original Text' : 'View Insights'}
            >
              {showAnalysis ? (
                <FileText className='h-3 w-3' />
              ) : (
                <Brain className='h-3 w-3' />
              )}
            </Button>
          )}

          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground hover:text-yellow-500'
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <Sparkles
              className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`}
            />
          </Button>

          {!isEditing && (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-muted-foreground hover:text-primary'
              onClick={() => setIsEditing(true)}
            >
              <Pencil className='h-3 w-3' />
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
            {showAnalysis && analysisData ? (
              <AnalysisView analysis={analysisData} />
            ) : (
              <div
                className={cn(
                  'relative group',
                  log.isRedacted ? 'cursor-pointer' : 'cursor-default',
                )}
                onClick={() => {
                  if (log.isRedacted) {
                    setIsRevealed(!isRevealed);
                  }
                }}
              >
                {/* 1. The Content (Blurred) */}
                <div
                  className={cn(
                    'mt-2 w-full text-sm prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent transition-all duration-300 rounded-md',
                    !isRevealed
                      ? 'blur-[6px] select-none bg-slate-200/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 p-2'
                      : '',
                  )}
                >
                  <ReactMarkdown>{initialContent}</ReactMarkdown>
                </div>

                {/* 2. The Overlay (Only shows when hidden) */}
                {!isRevealed && (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div
                      className={cn(
                        'bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm backdrop-blur-sm',
                        // TRANSITION LOGIC:
                        // 1. Base state (Exit): Fast duration, no delay.
                        'opacity-0 scale-95 transition-all duration-200 delay-0',

                        // 2. Hover state (Enter): Fade in, scale up... BUT wait 2000ms first.
                        'group-hover:opacity-100 group-hover:scale-100 group-hover:delay-500',
                      )}
                    >
                      Click to Reveal
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className='flex flex-wrap items-center gap-1.5 mt-3 mb-1'>
              {/* A. EXISTING TAGS */}
              {log.tagValues &&
                log.tagValues.map((val: string) => (
                  <span
                    key={val}
                    className='group inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 transition-all hover:pr-1 cursor-default'
                  >
                    #{val}
                    {/* Remove Button (Visible on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        handleTagToggle(val);
                      }}
                      className='w-0 overflow-hidden group-hover:w-4 group-hover:ml-1 transition-all duration-200 text-blue-500 hover:text-blue-700 dark:text-blue-400'
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

              {/* B. ADD TAG BUTTON (Smart Dropdown) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* LOGIC: If no tags, show "Add Tag" text. If tags exist, show small "+" circle. */}
                  {!log.tagValues || log.tagValues.length === 0 ? (
                    <button className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition-colors border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400'>
                      <Plus size={10} />
                      Add Tag
                    </button>
                  ) : (
                    <button
                      className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors'
                      title='Add Tag'
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </DropdownMenuTrigger>

                <DropdownMenuContent align='start' className='w-32'>
                  {availableTags.map((tag) => {
                    const isSelected = log.tagValues?.includes(tag);
                    return (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className='text-xs flex justify-between cursor-pointer'
                        disabled={isSelected}
                      >
                        {tag}
                        {isSelected && (
                          <TagIcon size={10} className='ml-2 opacity-50' />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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
