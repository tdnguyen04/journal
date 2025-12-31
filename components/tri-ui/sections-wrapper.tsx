import { cn } from '@/lib/utils';

interface SectionsWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default async function SectionsWrapper({
  children,
  className,
}: SectionsWrapperProps) {
  return (
    <div
      className={cn(
        'w-full flex-1 flex flex-col gap-20 max-w-4xl p-5 mx-auto',
        className,
      )}
    >
      {children}
    </div>
  );
}
