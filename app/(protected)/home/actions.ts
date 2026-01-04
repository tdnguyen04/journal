'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma/prisma';
import { createClient } from '@/lib/supabase/server';
import { LogSchema } from './schemas';

export type ActionState = {
  success: boolean;
  message: string;
};

export async function createLog(
  rawContent: string
){
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }

  // 1. Validate Input
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
        content: {
          note: parsed.data.content,
          timestamp: new Date().toISOString(),
        },
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

export async function deleteLog(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    // Security: We use updateMany/deleteMany with userId to ensure
    // a user cannot delete someone else's log by guessing an ID.
    // Prisma returns { count: n }. If count is 0, the log didn't exist or wasn't yours.
    const result = await prisma.log.deleteMany({
      where: {
        id: id,
        userId: user.id, // THE CRITICAL CHECK
      },
    });

    if (result.count === 0) {
      return { success: false, message: 'Log not found or unauthorized' };
    }

    revalidatePath('/home');
    return { success: true, message: 'Log deleted' };
  } catch (error) {
    console.error('Failed to delete log:', error);
    return { success: false, message: 'Failed to delete' };
  }
}

export async function updateLog(id: string, rawContent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }
  try {
    const parsed = LogSchema.safeParse({ content: rawContent });
    if (!parsed.success) {
      return { success: false, message: 'Content cannot be empty' };
    }
    const result = await prisma.log.updateMany({
      where: {
        id: id,
        userId: user.id, // THE CRITICAL CHECK
      },
      data: {
        content: { 
          note: parsed.data.content, 
          updatedAt: new Date().toISOString() 
        },
      },
    });
    if (result.count === 0) {
      return { success: false, message: 'Log not found or unauthorized' };
    }
    revalidatePath('/home');
    return { success: true, message: 'Log updated' };
  } catch (error) {
    return {
      success: false,
      message: `Log failed to update: ${JSON.stringify(error)}`,
    };
  }
}
