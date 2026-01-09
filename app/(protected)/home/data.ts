'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

/**
 * Get logs for a specific week
 * @param weekParam - ISO date string for the week start (e.g., "2026-01-06")
 *                    If not provided, defaults to current week
 */
export async function getLogs(weekParam?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

  // Calculate week boundaries
  const targetDate = weekParam ? parseISO(weekParam) : new Date();
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday

  // Fetch logs for this week only (database-level filtering)
  const logs = await prisma.log.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return logs;
}
