'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma/prisma';
import { createClient } from '@/lib/supabase/server';
import { PreferencesSchema } from './schemas';

export type ActionState = {
  success: boolean;
  message: string;
};

export async function savePreferences(preferences: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Unauthorized' };
  }

  // Validate input
  const parsed = PreferencesSchema.safeParse({ preferences });

  if (!parsed.success) {
    return { success: false, message: 'Preferences cannot be empty' };
  }

  try {
    // Upsert preferences (create or update)
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        preferences: parsed.data.preferences,
      },
      create: {
        userId: user.id,
        preferences: parsed.data.preferences,
      },
    });

    revalidatePath('/settings');
    return { success: true, message: 'Preferences saved successfully' };
  } catch (error) {
    console.error('Failed to save preferences:', error);
    return { success: false, message: 'Database error' };
  }
}

export async function getPreferences(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    return userPreferences?.preferences || null;
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return null;
  }
}

