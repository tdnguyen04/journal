'use client';

import { useRouter } from 'next/navigation';
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
  isSameWeek
} from 'date-fns';

interface WeekNavigatorProps {
  currentWeek?: string; // ISO date string, e.g., "2026-01-06"
}

export default function WeekNavigator({ currentWeek }: WeekNavigatorProps) {
  const router = useRouter();
  
  // Parse the current week or default to now
  const targetDate = currentWeek ? parseISO(currentWeek) : new Date();
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday
  
  const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 1 });
  
  // Format the week range for display
  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMM d');
    const endMonth = format(weekEnd, 'MMM d, yyyy');
    
    // If same month, show "Jan 6 - 12, 2026"
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
    }
    // Different months, show "Dec 30 - Jan 5, 2026"
    return `${startMonth} - ${endMonth}`;
  };

  const navigateToWeek = (date: Date) => {
    const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
    const weekParam = format(weekStartDate, 'yyyy-MM-dd');
    
    // If navigating to current week, remove the param for cleaner URL
    if (isThisWeek(weekStartDate, { weekStartsOn: 1 })) {
      router.push('/home');
    } else {
      router.push(`/home?week=${weekParam}`);
    }
  };

  const goToPrevWeek = () => {
    navigateToWeek(subWeeks(weekStart, 1));
  };

  const goToNextWeek = () => {
    navigateToWeek(addWeeks(weekStart, 1));
  };

  const goToToday = () => {
    router.push('/home');
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
