'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }

    // Replace URL without refreshing the page layout (just the server data)
    startTransition(() => {
      router.replace(`/home?${params.toString()}`);
    });
  }

  return (
    <div className="relative w-full mb-4">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search logs..."
        className="pl-8 bg-card"
        defaultValue={searchParams.get('q')?.toString()}
        onChange={(e) => {
           // Simple debounce: Wait 300ms logic could go here, 
           // but for MVP, React Transition handles the UI responsiveness well.
           handleSearch(e.target.value);
        }}
      />
      {isPending && (
        <div className="absolute right-2 top-2.5">
           <span className="flex h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
        </div>
      )}
    </div>
  );
}