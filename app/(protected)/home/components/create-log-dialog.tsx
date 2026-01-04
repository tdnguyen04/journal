'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { createLog } from '../actions';
import { toast } from 'sonner'; // <--- The new import

export function CreateLogDialog() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    const result = await createLog(content);
    setIsLoading(false);

    if (result.success) {
      setOpen(false);
      setContent('');
      toast.success("Log created", {
        description: "Your entry has been saved successfully."
      });
    } else {
      toast.error("Failed to create log", {
        description: "Please try again later."
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground h-12 px-4 mb-4"
        >
          <Plus className="mr-2 h-4 w-4" />
          Log your progress...
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Log</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-2">
          <Textarea 
            placeholder="What did you do today? (Markdown supported)" 
            className="min-h-[150px] font-mono text-sm resize-none p-4"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault(); // Prevent newline
                handleSave();
              }
            }}
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !content.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Log'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}