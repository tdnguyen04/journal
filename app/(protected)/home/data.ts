"use server"

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';

export async function getLogs() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  const logs = await prisma.log.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return logs;
}
