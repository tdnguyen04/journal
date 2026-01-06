'use server';

import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Schema = z.object({
  preferences: z.string().max(5000),
});

export async function savePreferences(rawInput: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Unauthorized' };

  const parsed = Schema.safeParse({ preferences: rawInput });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  try {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: { preferences: parsed.data.preferences },
      create: { 
        userId: user.id,
        preferences: parsed.data.preferences 
      },
    });

    revalidatePath('/settings');
    return { success: true, message: 'Settings saved' };
  } catch (error) {
    return { success: false, message: 'Database error' };
  }
}

export async function getPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });
  
  return prefs?.preferences || '';
}

export async function generateConnectionToken() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Unauthorized' };

  // Generate a 6-digit code
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Grab the name from Supabase to "Snapshot" it for the bot
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Friend";

  try {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: { 
        connectToken: token,
        userName: name // Update name cache
      },
      create: { 
        userId: user.id, 
        connectToken: token,
        userName: name,
        preferences: "" // Prevent null error
      },
    });

    return { success: true, token };
  } catch (error) {
    console.error("Token Gen Error:", error);
    return { success: false, message: 'Failed to generate token' };
  }
}

export async function getConnectionStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isConnected: false, pendingToken: null };

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
    select: { 
      telegramChatId: true, 
      connectToken: true 
    }
  });

  return {
    isConnected: !!prefs?.telegramChatId, // True if they have a Chat ID
    pendingToken: prefs?.connectToken || null // The code (if they haven't used it yet)
  };
}

export async function updateCustomTags(newTags: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { customValues: newTags },
    });
    
    // Refresh both pages so the new tags appear immediately
    revalidatePath('/home');
    revalidatePath('/settings');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update tags:', error);
    return { success: false, message: 'Failed to update tags' };
  }
}