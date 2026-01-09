'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutList, CalendarDays } from 'lucide-react';
import LogList from './log-list';
import { TimelineView } from './timeline-view';

interface LogViewToggleProps {
  logs: any[];
  availableTags: string[];
}

type ViewMode = 'list' | 'timeline';

export function LogViewToggle({ logs, availableTags }: LogViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read view from URL, default to 'list'
  const view = (searchParams.get('view') as ViewMode) || 'list';
  
  const setView = (newView: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newView === 'list') {
      // Remove view param for default (cleaner URL)
      params.delete('view');
    } else {
      params.set('view', newView);
    }
    
    const queryString = params.toString();
    router.push(`/home${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Controls */}
      <div className="flex justify-end">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => setView('list')}
            data-state={view === 'list' ? 'active' : 'inactive'}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            aria-label="List View"
          >
            <LayoutList className="h-4 w-4 mr-2" />
            List
          </button>
          <button
            onClick={() => setView('timeline')}
            data-state={view === 'timeline' ? 'active' : 'inactive'}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            aria-label="Timeline View"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Timeline
          </button>
        </div>
      </div>

      {/* Render Strategy */}
      <div className="animate-in fade-in zoom-in-95 duration-200">
        {view === 'list' ? (
          <LogList logs={logs} availableTags={availableTags} />
        ) : (
          <TimelineView logs={logs} /> 
        )}
      </div>
    </div>
  );
}
