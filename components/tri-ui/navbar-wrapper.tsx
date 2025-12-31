import { cn } from '@/lib/utils';

interface NavbarWrapperProps {
  children: React.ReactNode;
}

export default async function NavbarWrapper({ children }: NavbarWrapperProps) {
  return (
    <nav className='w-full flex justify-center border-b border-b-foreground/10 h-16'>
      <div className='w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm'>
        {children}
      </div>
    </nav>
  );
}
