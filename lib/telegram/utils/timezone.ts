import prisma from '@/lib/prisma/prisma';

/**
 * Format a date in a friendly way (e.g., "9:00 PM", "Yesterday 9:00 PM", "Jan 5, 9:00 PM")
 */
export function formatFriendlyDate(date: Date, timezone: string = 'America/New_York'): string {
  const now = new Date();
  
  // Format dates in user's timezone for comparison
  const dateInTz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const isToday = dateInTz.toDateString() === nowInTz.toDateString();

  // Check if yesterday
  const yesterday = new Date(nowInTz);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateInTz.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;

  // Format: Jan 5, 9:00 PM
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone })}, ${timeStr}`;
}

/**
 * Get user's timezone preference (defaults to America/New_York)
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return prefs?.timezone || 'America/New_York';
}

/**
 * Get user preferences for gap handling (timezone + auto-chain threshold)
 */
export async function getUserPrefs(userId: string): Promise<{ timezone: string; autoChainMinutes: number }> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { timezone: true, autoChainMinutes: true },
  });
  return {
    timezone: prefs?.timezone || 'America/New_York',
    autoChainMinutes: prefs?.autoChainMinutes ?? 15,
  };
}

/**
 * Determine time of day based on hour in user's timezone
 */
export function getTimeOfDay(date: Date, timezone: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Format gap duration nicely (e.g., "30m", "2h", "1h 30m")
 */
export function formatGapDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
