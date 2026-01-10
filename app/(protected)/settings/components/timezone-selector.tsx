'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe, Check } from 'lucide-react';
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

// Format timezone for display (e.g., "America/New_York" -> "New York (UTC-5)")
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
  const [timezone, setTimezone] = useState('UTC');
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Timezone
        </CardTitle>
        <CardDescription>
          Set your timezone for Telegram bot time displays.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Current: <span className="font-mono text-primary">{formatTimezone(timezone)}</span></Label>
          
          <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 space-y-4">
            {Object.entries(TIMEZONE_GROUPS).map(([region, zones]) => (
              <div key={region}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                  {region}
                </div>
                <div className="space-y-1">
                  {zones.map((tz) => (
                    <button
                      key={tz}
                      onClick={() => handleSave(tz)}
                      disabled={isLoading}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                        timezone === tz 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span>{formatTimezone(tz)}</span>
                      {timezone === tz && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
