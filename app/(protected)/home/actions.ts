'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma/prisma';
import { createClient } from '@/lib/supabase/server';
import { LogSchema } from './schemas';

export type ActionState = {
  success: boolean;
  message: string;
};

export async function createLog(prevState: any, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }

  // 1. Validate Input
  const rawContent = formData.get('content');
  const parsed = LogSchema.safeParse({ content: rawContent });

  if (!parsed.success) {
    return { success: false, message: 'Content cannot be empty' };
  }

  try {
    // 2. Database Write
    await prisma.log.create({
      data: {
        userId: user.id,
        // Storing as JSON to match your schema
        content: { note: parsed.data.content, timestamp: new Date().toISOString() },
      },
    });

    // 3. Refresh UI
    revalidatePath('/home');
    return { success: true, message: 'Log saved' };
  } catch (error) {
    console.error('Failed to create log:', error);
    return { success: false, message: 'Database error' };
  }
}