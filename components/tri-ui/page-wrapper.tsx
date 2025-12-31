import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default async function PageWrapper({
  children,
  className,
}: PageWrapperProps) {
  return (
    <div className={cn('flex-1 w-full flex flex-col gap-12', className)}>
      {children}
    </div>
  );
}
