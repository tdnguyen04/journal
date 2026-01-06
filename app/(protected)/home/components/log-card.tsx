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
import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // <--- Now actively used
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!log.isRedacted);

  // OPTIMISTIC CONTENT:
  // We initialize with the prop, but we update this LOCAL state immediately on save.
  // This prevents the "glitch" where the UI reverts to old data while waiting for the server.
  const initialContent =
    typeof log.content === 'string' ? log.content : log.content?.note || '';
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [editedContent, setEditedContent] = useState(initialContent);

  // Sync prop changes to local state (in case Realtime updates happen from elsewhere)
  useEffect(() => {
    setDisplayContent(initialContent);
    setEditedContent(initialContent);
  }, [initialContent]);

  // --- ACTIONS ---
  const handleSave = async () => {
    setIsLoading(true); // Start spinner

    // 1. Server Action
    const result = await updateLog(log.id, editedContent);

    if (result.success) {
      // 2. Optimistic Update (The Fix)
      // Update the viewer immediately, don't wait for revalidatePath
      setDisplayContent(editedContent);
      setIsEditing(false);
    } else {
      toast.error(result.message);
    }

    setIsLoading(false); // Stop spinner
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLog(log.id);
    setIsAnalyzing(false);
    if (!result.success) toast.error(result.message);
  };

  const handleDelete = async () => {
    setIsExiting(true);
    // We await here to keep the 'Deleting...' state active if the parent prop is async
    await onDelete();
  };

  // Helper
  const analysisData = (log.content as any)?.analysis as Analysis | undefined;

  return (
    <Card
      className={cn(
        'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isExiting
          ? 'translate-x-full opacity-0 bg-destructive/10 border-destructive'
          : 'translate-x-0 opacity-100 hover:bg-muted/50',
        'animate-in fade-in slide-in-from-top-4 duration-500',
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        {/* Left Side: Icon & Title */}
        <div className='flex items-center gap-2'>
          <div className='rounded-md bg-primary/10 p-2 text-primary'>
            <Terminal className='h-4 w-4' />
          </div>
          <CardTitle className='text-sm font-medium leading-none'>
            System Log
          </CardTitle>
        </div>

        {/* Right Side: Toolbar */}
        <LogHeader
          log={log}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isRevealed={isRevealed}
          setIsRevealed={setIsRevealed}
          showAnalysis={showAnalysis}
          setShowAnalysis={setShowAnalysis}
          isAnalyzing={isAnalyzing}
          handleAnalyze={handleAnalyze}
          hasAnalysis={!!analysisData}
          onDelete={handleDelete}
          isExiting={isExiting}
        />
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <LogEditor
            content={editedContent}
            setContent={setEditedContent}
            onSave={handleSave}
            onCancel={() => {
              setIsEditing(false);
              setEditedContent(displayContent); // Revert to current display on cancel
            }}
            isLoading={isLoading} // <--- Pass down the Loading State
          />
        ) : (
          <>
            <LogViewer
              content={displayContent} // <--- Use the Optimistic State
              isRedacted={log.isRedacted}
              isRevealed={isRevealed}
              setIsRevealed={setIsRevealed}
              showAnalysis={showAnalysis}
              analysisData={analysisData}
            />

            <LogTags
              logId={log.id}
              currentTags={log.tagValues || []}
              availableTags={availableTags}
            />

            <div className='mt-2 text-[10px] text-muted-foreground uppercase tracking-widest'>
              ID: {log.id}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 2. SUB-COMPONENT: HEADER (Toolbar)
// ============================================================================
function LogHeader({
  log,
  isEditing,
  setIsEditing,
  isRevealed,
  setIsRevealed,
  showAnalysis,
  setShowAnalysis,
  isAnalyzing,
  handleAnalyze,
  hasAnalysis,
  onDelete,
  isExiting,
}: any) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
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

      {/* Redaction Toggle */}
      {log.isRedacted && (
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={() => setIsRevealed(!isRevealed)}
        >
          {isRevealed ? (
            <EyeOff className='h-3 w-3' />
          ) : (
            <Eye className='h-3 w-3' />
          )}
        </Button>
      )}

      {/* Analysis Toggle */}
      {hasAnalysis && (
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          {showAnalysis ? (
            <FileText className='h-3 w-3' />
          ) : (
            <Brain className='h-3 w-3' />
          )}
        </Button>
      )}

      {/* Analyze Action */}
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6 hover:text-yellow-500'
        onClick={handleAnalyze}
        disabled={isAnalyzing}
      >
        <Sparkles className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
      </Button>

      {/* Edit Toggle */}
      {!isEditing && (
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={() => setIsEditing(true)}
        >
          <Pencil className='h-3 w-3' />
        </Button>
      )}

      <DeleteButton onDelete={onDelete} isLoading={isExiting} />
    </div>
  );
}

// ============================================================================
// 3. SUB-COMPONENT: EDITOR (Textarea + Save/Cancel)
// ============================================================================
function LogEditor({ content, setContent, onSave, onCancel }: any) {
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <div className='flex flex-col gap-2 mt-2'>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className='font-mono text-xs bg-background min-h-[100px]'
      />
      <div className='flex justify-end gap-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className='h-3 w-3 mr-1' /> Cancel
        </Button>
        <Button size='sm' onClick={handleSaveClick} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className='h-3 w-3 animate-spin' />
          ) : (
            <Check className='h-3 w-3 mr-1' />
          )}{' '}
          Save
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// 4. SUB-COMPONENT: VIEWER (Markdown + Blur Logic)
// ============================================================================
function LogViewer({
  content,
  isRedacted,
  isRevealed,
  setIsRevealed,
  showAnalysis,
  analysisData,
}: any) {
  if (showAnalysis && analysisData) {
    return <AnalysisView analysis={analysisData} />;
  }

  return (
    <div
      className={cn(
        'relative group',
        isRedacted ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={() => isRedacted && setIsRevealed(!isRevealed)}
    >
      <div
        className={cn(
          'mt-2 w-full text-sm prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent transition-all duration-300 rounded-md',
          !isRevealed
            ? 'blur-[6px] select-none bg-slate-200/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 p-2'
            : '',
        )}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>

      {!isRevealed && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm backdrop-blur-sm opacity-0 scale-95 transition-all duration-200 delay-0 group-hover:opacity-100 group-hover:scale-100 group-hover:delay-500'>
            Click to Reveal
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. SUB-COMPONENT: TAGS
// ============================================================================
function LogTags({
  logId,
  currentTags,
  availableTags,
}: {
  logId: string;
  currentTags: string[];
  availableTags: string[];
}) {
  const [optimisticTags, setOptimisticTags] = useState(currentTags);

  const handleTagToggle = async (tag: string) => {
    // Optimistic Update
    const isRemoving = optimisticTags.includes(tag);
    const newTags = isRemoving
      ? optimisticTags.filter((t) => t !== tag)
      : [...optimisticTags, tag];
    setOptimisticTags(newTags);

    // Server Action
    const result = await toggleLogTag(logId, tag);
    if (!result.success) {
      setOptimisticTags(currentTags); // Revert
      toast.error('Failed to update tag');
    }
  };

  useEffect(() => {
    setOptimisticTags(currentTags);
  }, [currentTags]);

  return (
    <div className='flex flex-wrap items-center gap-1.5 mt-3 mb-1'>
      {optimisticTags.map((val) => (
        <span
          key={val}
          className='group inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 transition-all hover:pr-1 cursor-default'
        >
          #{val}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTagToggle(val);
            }}
            className='w-0 overflow-hidden group-hover:w-4 group-hover:ml-1 transition-all duration-200 text-blue-500 hover:text-blue-700 dark:text-blue-400'
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {optimisticTags.length === 0 ? (
            <button className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition-colors border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400'>
              <Plus size={10} /> Add Tag
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
            const isSelected = optimisticTags.includes(tag);
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
  );
}
