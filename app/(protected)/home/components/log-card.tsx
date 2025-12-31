'use client';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Clock } from 'lucide-react';
import { Log } from '@/app/generated/prisma/client';

interface LogCardProps {
  log: Omit<Log, 'createdAt' | 'userId'> & { 
    createdAt: string | Date 
  };
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

export default function LogCard({ log }: LogCardProps) {
  const displayContent =
    typeof log.content === 'string'
      ? log.content
      : JSON.stringify(log.content, null, 2);
  console.log(displayContent);
  return (
    <Card className='hover:bg-muted/50'>
      <CardHeader className='grid grid-cols-[1fr_auto] items-start gap-4 space-y-0 pb-2'>
        <div className='flex items-center gap-2'>
          <div className='rounded-md bg-primary/10 p-2 text-primary'>
            <Terminal className='h-4 w-4' />
          </div>
          <CardTitle className='text-sm font-medium leading-none'>
            System Log
          </CardTitle>
        </div>
        <Badge
          variant='outline'
          className='flex items-center gap-1 font-mono text-xs font-normal text-muted-foreground'
        >
          <Clock className='h-3 w-3' />
          {formatDate(log.createdAt)}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* The Content: Monospace font for that 'hacker' vibe */}
        <pre className='mt-2 w-full overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-50'>
          {displayContent}
        </pre>

        {/* Footer ID (Subtle) */}
        <div className='mt-2 text-[10px] text-muted-foreground uppercase tracking-widest'>
          ID: {log.id}
        </div>
      </CardContent>
    </Card>
  );
}
