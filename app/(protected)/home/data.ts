'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';

export async function getLogs(query: string = '') {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  const allLogs = await prisma.log.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!query) {
    return allLogs;
  }

  const lowerQuery = query.toLowerCase();

  return allLogs.filter((log) => {
    // 1. Check Content (The Note)
    const contentText =
      typeof log.content === 'string'
        ? log.content
        : (log.content as any)?.note || '';

    const matchesContent = contentText.toLowerCase().includes(lowerQuery);

    // 2. Check Date (The Timestamp)
    // We format it loosely so "Jan", "January 5", or "2025" all work
    const date = new Date(log.createdAt);
    const dateString = date.toLocaleDateString('en-US', {
      weekday: 'long', // "Monday"
      month: 'long', // "January"
      day: 'numeric', // "5"
      year: 'numeric', // "2025"
    });

    const matchesDate = dateString.toLowerCase().includes(lowerQuery);

    // Return true if EITHER matches
    return matchesContent || matchesDate;
  });
}
