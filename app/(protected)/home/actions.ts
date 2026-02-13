'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma/prisma';
import { createClient } from '@/lib/supabase/server';
import { LogSchema } from './schemas';
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai'
import { AnalysisSchema } from '@/lib/validations/analysis';
import {
  createNote,
  deleteLog as deleteLogOp,
  updateLogContent,
} from '@/lib/helpers/log-operations';
import { LogContent } from '@/lib/helpers/log';


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
    // 2. Database Write - Note has no time tracking
    await createNote({
      userId: user.id,
      text: parsed.data.content,
      source: 'browser',
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
    // Security: deleteLog operation includes ownership check
    await deleteLogOp({
      logId: id,
      userId: user.id,
      source: 'browser',
    });

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
    
    await updateLogContent({
      logId: id,
      userId: user.id,
      newContent: {
        note: parsed.data.content,
        updatedAt: new Date().toISOString(),
      },
    });
    
    revalidatePath('/home');
    return { success: true, message: 'Log updated' };
  } catch (error) {
    return {
      success: false,
      message: `Log failed to update: ${JSON.stringify(error)}`,
    };
  }
}

export async function analyzeLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Unauthorized' };

  // 1. Fetch Log and User Preferences
  const [log, prefs] = await Promise.all([
    prisma.log.findUnique({ where: { id, userId: user.id } }),
    prisma.userPreferences.findUnique({ where: { userId: user.id } })
  ]);

  if (!log) return { success: false, message: 'Log not found' };

  // 2. Prepare content
  const contentText = typeof log.content === 'string' 
    ? log.content 
    : (log.content as any)?.note || '';

  const userInstructions = prefs?.preferences 
    ? `The user has specified these tracking preferences: "${prefs.preferences}". Focus strictly on extracting these metrics.`
    : "The user has no specific preferences. Extract general interesting metrics.";

  try {
    // 3. Call OpenAI (SDK v6 Syntax)
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      
      // The new "Standard" way to get JSON:
      output: Output.object({ 
        schema: AnalysisSchema 
      }),
      
      prompt: `
        Analyze this journal entry:
        "${contentText}"

        ${userInstructions}
        
        Extract sentiment, tags, and specifically any metrics that match the user's preferences.
      `,
    });

    // 4. Save result
    // Extract existing content, ensuring it has the required 'note' field
    const existingContent = typeof log.content === 'object' && log.content !== null && !Array.isArray(log.content)
      ? (log.content as unknown as LogContent)
      : { note: contentText };
    
    // Ensure note is preserved when adding analysis
    const updatedContent: LogContent = {
      note: existingContent.note || contentText, // Ensure note is always present
      ...existingContent,
      analysis: output, // <--- It returns 'output', not 'object' now
    };
    
    await updateLogContent({
      logId: id,
      userId: user.id,
      newContent: updatedContent,
    });

    revalidatePath('/home');
    return { success: true, message: 'Analysis complete' };

  } catch (error: any) {
    console.error("AI Error Details:", error);
    return { success: false, message: `Analysis failed: ${error.message}` };
  }
}

export async function toggleLogTag(logId: string, tag: string) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  try {
    // Fetch log with ownership check
    const log = await prisma.log.findUnique({
      where: { id: logId, userId: user.id },  // ← Ownership verification
      select: { tagValues: true }
    });

    if (!log) return { success: false, message: "Log not found or unauthorized" };

    const currentTags = log.tagValues || [];
    let newTags;

    if (currentTags.includes(tag)) {
      // REMOVE IT
      newTags = currentTags.filter(t => t !== tag);
    } else {
      // ADD IT (Prevent duplicates just in case)
      newTags = [...currentTags, tag];
    }

    // Update with ownership check (defense in depth)
    await prisma.log.updateMany({
      where: { id: logId, userId: user.id },
      data: { tagValues: newTags }
    });

    revalidatePath('/home');
    return { success: true, message: "Updated" };

  } catch (error) {
    console.error("Tag update failed:", error);
    return { success: false, message: "Failed to update tag" };
  }
}