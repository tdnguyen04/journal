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

  return allLogs.filter((log) => {
    const text =
      typeof log.content === 'string'
        ? log.content
        : (log.content as any)?.note || '';
    return text.toLowerCase().includes(query.toLowerCase());
  });
}
