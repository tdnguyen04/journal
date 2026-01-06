'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Check, Copy, Loader2 } from 'lucide-react';
import { generateConnectionToken } from '../actions';
import { toast } from 'sonner';

export function TelegramConnect() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateConnectionToken();
    setIsLoading(false);

    if (result.success && result.token) {
      setToken(result.token);
      toast.success("Code generated!");
    } else {
      toast.error(`Failed to generate code: ${result.message}`);
    }
  };

  return (
    <Card className="mt-6 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-500" />
          Connect Telegram
        </CardTitle>
        <CardDescription>
          Log your habits directly from your phone without opening the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Connection Code
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Connection Code</p>
              <div className="text-3xl font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">
                {token}
              </div>
            </div>
            
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>1. Open your bot on Telegram: <strong>@MyLifeLog_bot</strong> (Use your bot name)</p>
              <p>2. Send the message:</p>
              <code className="block p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs select-all">
                /start {token}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}