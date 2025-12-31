import { cn } from '@/lib/utils';
import { InfoIcon } from 'lucide-react';

interface InfoNoteProps {
  children: React.ReactNode;
  className?: string;
}

export default async function InfoNote({ children, className }: InfoNoteProps) {
  return (
    <div
      className={cn(
        'bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center',
        className,
      )}
    >
      <InfoIcon size='16' strokeWidth={2} />
      {children}
    </div>
  );
}
