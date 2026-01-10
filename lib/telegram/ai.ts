// lib/telegram/ai.ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function parseDurationWithAI(userText: string): Promise<number | null> {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'), // Fast & Cheap model
      prompt: `
        Extract the duration in MINUTES from this text: "${userText}".
        
        Rules:
        - "1h" -> 60
        - "90m" -> 90
        - "An hour and a half" -> 90
        - "Since 4pm" -> null (Context missing)
        - "Just now" -> 0
        - "Unknown" -> null
        
        Return ONLY the number (integer). If unclear, return "null".
      `,
    });

    const minutes = parseInt(text.trim());
    return isNaN(minutes) ? null : minutes;
  } catch (error) {
    console.error("❌ AI Parse Error:", error);
    return null; 
  }
}

export async function generateGapCheckIn(context: {
  currentTask: string;
  lastTask: string;
  gapDuration: string;
  taskCountToday: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}): Promise<string> {
  const { currentTask, lastTask, gapDuration, taskCountToday, timeOfDay } = context;
  
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `You are a friendly journal assistant. The user just logged a task. There was a gap since their last task, so you want to gently ask about it.

Context:
- They just logged: "${currentTask}"
- Last task was: "${lastTask}"  
- Time since last task: ${gapDuration}
- Tasks logged today: ${taskCountToday}
- Time of day: ${timeOfDay}

Write a SHORT response (2 sentences max) that:
1. Acknowledges you saved their task
2. Mentions the gap naturally (not accusingly)
3. Invites them to clarify the duration OR skip

Tone: Warm, casual, like a friend checking in. Vary your phrasing.
Do NOT use emojis. Do NOT be formal. Do NOT lecture.

Examples of good responses:
- "Got it! Been about 2 hours since your standup. How long did this take?"
- "Logged! It's been a while since lunch. Let me know the duration, or just skip."

Your response:`,
    });

    return text.trim();
  } catch (error) {
    console.error("❌ AI Gap Check-in Error:", error);
    // Fallback to simple message if AI fails
    return `Logged! It's been ${gapDuration} since "${lastTask}". How long did this take?`;
  }
}