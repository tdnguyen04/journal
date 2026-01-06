'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { updateCustomTags } from '../actions'; // Ensure this points to your actions file
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function TagManager({ initialTags }: { initialTags: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAddTag = async () => {
    const newTag = inputValue.trim();
    
    // Validation
    if (!newTag) return;
    if (newTag.length > 20) {
      toast.error('Tag is too long (max 20 chars)');
      return;
    }
    if (tags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
      toast.error('Tag already exists');
      return;
    }

    // Optimistic Update
    const newTagsList = [...tags, newTag];
    setTags(newTagsList);
    setInputValue('');
    
    // Server Sync
    setIsLoading(true);
    const result = await updateCustomTags(newTagsList);
    setIsLoading(false);

    if (result.success) {
      toast.success('Tag added');
      router.refresh();
    } else {
      setTags(tags); // Revert
      toast.error(result.message);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    // Optimistic Update
    const newTagsList = tags.filter(t => t !== tagToRemove);
    setTags(newTagsList);

    // Server Sync
    setIsLoading(true);
    const result = await updateCustomTags(newTagsList);
    setIsLoading(false);

    if (!result.success) {
      setTags(tags); // Revert
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-sm">
        <Input 
          placeholder="New tag name (e.g. 'Fitness')" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          disabled={isLoading}
          className="font-mono text-sm"
        />
        <Button onClick={handleAddTag} disabled={isLoading || !inputValue.trim()} size="icon">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 p-4 border rounded-md min-h-[100px] content-start bg-slate-50 dark:bg-slate-900/50">
        {tags.length === 0 && (
          <span className="text-sm text-muted-foreground italic select-none">
            No custom tags yet. Add one above!
          </span>
        )}
        {tags.map(tag => (
          <Badge 
            key={tag} 
            variant="secondary" 
            className="pl-2 pr-1 py-1 flex items-center gap-1 text-sm font-medium transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            {tag}
            <button 
              onClick={() => handleRemoveTag(tag)}
              disabled={isLoading}
              className="rounded-full p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-muted-foreground hover:text-destructive"
            >
              <X size={14} />
            </button>
          </Badge>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        These tags will appear in your Telegram bot buttons and your Dashboard filter menu.
      </p>
    </div>
  );
}