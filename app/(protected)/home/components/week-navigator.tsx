'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  format, 
  parseISO,
  isThisWeek,
} from 'date-fns';

interface WeekNavigatorProps {
  currentWeek?: string; // ISO date string, e.g., "2026-01-06"
}

export default function WeekNavigator({ currentWeek }: WeekNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parse the current week or default to now
  const targetDate = currentWeek ? parseISO(currentWeek) : new Date();
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday
  
  const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 1 });
  
  // Preserve view param when navigating
  const currentView = searchParams.get('view');
  
  // Format the week range for display
  const formatWeekRange = () => {
    // If same month, show "Jan 6 - 12, 2026"
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
    }
    // Different months, show "Dec 30 - Jan 5, 2026"
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  const buildUrl = (weekDate: Date | null) => {
    const params = new URLSearchParams();
    
    // Add week param if not current week
    if (weekDate) {
      const weekStartDate = startOfWeek(weekDate, { weekStartsOn: 1 });
      if (!isThisWeek(weekStartDate, { weekStartsOn: 1 })) {
        params.set('week', format(weekStartDate, 'yyyy-MM-dd'));
      }
    }
    
    // Preserve view param
    if (currentView) {
      params.set('view', currentView);
    }
    
    const queryString = params.toString();
    return `/home${queryString ? `?${queryString}` : ''}`;
  };

  const goToPrevWeek = () => {
    router.push(buildUrl(subWeeks(weekStart, 1)));
  };

  const goToNextWeek = () => {
    router.push(buildUrl(addWeeks(weekStart, 1)));
  };

  const goToToday = () => {
    router.push(buildUrl(null));
  };

  return (
    <div className="flex items-center justify-between mb-4 py-2">
      {/* Left: Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToPrevWeek}
          title="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToNextWeek}
          title="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Week display */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {formatWeekRange()}
        </span>
        {isCurrentWeek && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            This week
          </span>
        )}
      </div>

      {/* Right: Today button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={goToToday}
        disabled={isCurrentWeek}
      >
        Today
      </Button>
    </div>
  );
}
