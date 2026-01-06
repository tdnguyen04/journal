'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Send,
  Loader2,
  CheckCircle2,
  RefreshCw,
  LogOut,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { disconnectTelegram, generateConnectionToken } from '../actions';
import { toast } from 'sonner';
import { TelegramDebugButton } from './telegram-debug-button';
import { cn } from '@/lib/utils';

interface ConnectionStatus {
  isConnected: boolean;
  pendingToken: string | null;
}

export function TelegramConnect({
  initialStatus,
}: {
  initialStatus: ConnectionStatus;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(initialStatus.isConnected);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle for the "Techy" stuff
  const [showAdvanced, setShowAdvanced] = useState(false);

  const BOT_USERNAME = 'MyLifeLog_bot'; // Replace with your actual bot username

  useEffect(() => {
    setIsConnected(initialStatus.isConnected);
    setToken(initialStatus.pendingToken);
  }, [initialStatus]);

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateConnectionToken();
    setIsLoading(false);

    if (result.success && result.token) {
      setToken(result.token);
      toast.success('Code generated!');
    } else {
      toast.error(`Failed to generate code: ${result.message}`);
    }
  };

  const handleCancel = () => {
    setToken(null);
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect? You won't be able to log via Telegram until you reconnect.",
      )
    )
      return;

    setIsLoading(true);
    const result = await disconnectTelegram();
    setIsLoading(false);

    if (result.success) {
      setIsConnected(false);
      setToken(null);
      toast.success('Disconnected from Telegram');
    } else {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card className='mt-6 border-slate-200 dark:border-slate-800 shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Send
            className={cn(
              'h-5 w-5',
              isConnected ? 'text-green-500' : 'text-blue-500',
            )}
          />
          {isConnected ? 'Telegram Connected' : 'Connect Telegram'}
        </CardTitle>
        <CardDescription>
          {isConnected
            ? 'Your account is linked. Open Telegram to start logging.'
            : 'Log your habits quickly from your phone without opening this app.'}
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        {isConnected ? (
          // ================= SUCCESS STATE =================
          <div className='flex items-center justify-between p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <div>
                <p className='text-sm font-medium text-green-900 dark:text-green-300'>
                  Active & Ready
                </p>
                <p className='text-xs text-green-700 dark:text-green-500'>
                  The bot is listening for your logs.
                </p>
              </div>
            </div>

            <Button
              variant='ghost'
              size='sm'
              onClick={handleDisconnect}
              disabled={isLoading}
              className='text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            >
              <LogOut className='mr-2 h-4 w-4' />
              Disconnect
            </Button>
          </div>
        ) : (
          // ================= CONNECT STATE =================
          <>
            {!token ? (
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className='w-full sm:w-auto'
              >
                {isLoading ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Smartphone className='mr-2 h-4 w-4' />
                )}
                Generate Connection Code
              </Button>
            ) : (
              <div className='space-y-6 animate-in fade-in slide-in-from-top-2'>
                {/* 1. Primary Action: The Deep Link */}
                <div className='p-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md hover:shadow-lg transition-shadow'>
                  <a
                    href={`https://t.me/${BOT_USERNAME}?start=${token}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-950 rounded-[4px] text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-slate-900 transition-colors'
                  >
                    <Send className='w-4 h-4' />
                    Open Telegram to Connect
                  </a>
                </div>

                {/* 2. Secondary Action: Manual Code */}
                <div className='rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      Manual Option
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={handleCancel}
                      className='h-6 px-2 text-xs text-muted-foreground hover:text-destructive'
                    >
                      <RefreshCw className='mr-1.5 h-3 w-3' />
                      Reset Code
                    </Button>
                  </div>

                  <p className='text-sm text-muted-foreground mb-2'>
                    If the button above doesn't work, send this to{' '}
                    <strong>@{BOT_USERNAME}</strong>:
                  </p>
                  <code className='block w-full p-2 bg-slate-100 dark:bg-slate-900 rounded text-center font-mono text-sm font-bold tracking-wide select-all'>
                    /start {token}
                  </code>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= TROUBLESHOOTING TOGGLE ================= */}
        <div className='pt-4 border-t border-slate-100 dark:border-slate-800'>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className='flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
          >
            <HelpCircle className='h-3 w-3' />
            {showAdvanced
              ? 'Hide Troubleshooting'
              : 'Having trouble connecting?'}
          </button>

          {/* Hidden Techy Stuff */}
          {showAdvanced && (
            <div className='mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg animate-in fade-in zoom-in-95 duration-200'>
              <p className='text-xs text-muted-foreground mb-3'>
                Use these tools if the bot isn't responding or if you changed
                your website URL.
              </p>
              <TelegramDebugButton />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
