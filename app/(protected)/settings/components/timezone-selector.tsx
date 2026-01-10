'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { saveTimezone, getTimezone } from '../actions';
import { toast } from 'sonner';

// Common timezones grouped by region
const TIMEZONE_GROUPS = {
  'Americas': [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'America/Sao_Paulo',
    'America/Mexico_City',
  ],
  'Europe': [
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Stockholm',
    'Europe/Moscow',
  ],
  'Asia': [
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Seoul',
    'Asia/Bangkok',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Ho_Chi_Minh',
  ],
  'Pacific': [
    'Pacific/Auckland',
    'Pacific/Sydney',
    'Australia/Melbourne',
    'Pacific/Honolulu',
  ],
  'Other': [
    'UTC',
  ],
};

// Format timezone for display (e.g., "America/New_York" -> "New York (GMT-5)")
function formatTimezone(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const cityName = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return `${cityName} (${offset})`;
  } catch {
    return tz;
  }
}

export function TimezoneSelector() {
  const [timezone, setTimezone] = useState('America/New_York');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const tz = await getTimezone();
        setTimezone(tz);
      } catch (error) {
        console.error('Failed to load timezone:', error);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    loadTimezone();
  }, []);

  const handleSave = async (newTimezone: string) => {
    setIsLoading(true);
    setTimezone(newTimezone);
    
    const result = await saveTimezone(newTimezone);
    setIsLoading(false);

    if (result.success) {
      toast.success('Timezone updated');
    } else {
      toast.error(result.message || 'Failed to save timezone');
    }
  };

  if (isLoadingInitial) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Timezone
        </CardTitle>
        <CardDescription className="text-xs">
          For Telegram bot time displays
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={isLoading}>
              <span className="font-medium">{formatTimezone(timezone)}</span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-[300px] overflow-y-auto">
            {Object.entries(TIMEZONE_GROUPS).map(([region, zones], idx) => (
              <div key={region}>
                {idx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs">{region}</DropdownMenuLabel>
                {zones.map((tz) => (
                  <DropdownMenuItem
                    key={tz}
                    onClick={() => handleSave(tz)}
                    className="flex items-center justify-between"
                  >
                    <span>{formatTimezone(tz)}</span>
                    {timezone === tz && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
