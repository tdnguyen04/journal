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
- Their previous task was: "${lastTask}"  
- Time since previous task: ${gapDuration}
- Tasks logged today: ${taskCountToday}
- Time of day: ${timeOfDay}

Write a SHORT response (2 sentences max) that:
1. Acknowledges you saved their task
2. MUST mention the previous task "${lastTask}" by name
3. Mentions the time gap naturally (not accusingly)
4. Invites them to clarify the duration OR skip

Tone: Warm, casual, like a friend checking in. Vary your phrasing.
Do NOT use emojis. Do NOT be formal. Do NOT lecture.
IMPORTANT: Always reference the previous task by name, not "your last log" or "your last task".

Examples of good responses:
- "Got it! Been about 2 hours since 'morning standup'. How long did this take?"
- "Logged! It's been ${gapDuration} since '${lastTask}'. Let me know the duration, or just skip."

Your response:`,
    });

    return text.trim();
  } catch (error) {
    console.error("❌ AI Gap Check-in Error:", error);
    // Fallback to simple message if AI fails
    return `Logged! It's been ${gapDuration} since "${lastTask}". How long did this take?`;
  }
}

// Summarize long task names (keeps short ones as-is)
const TASK_LENGTH_THRESHOLD = 50;

export async function summarizeTask(task: string): Promise<string> {
  // Short tasks don't need summarization
  if (task.length <= TASK_LENGTH_THRESHOLD) {
    return task;
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Summarize this task description in 5-8 words. Keep the essence, drop details.

Task: "${task}"

Rules:
- Keep it natural, not robotic
- Preserve the main activity
- No quotes in output
- No periods at the end

Examples:
- "Had a long meeting with the marketing team about Q2 planning and budget allocation" -> "Marketing team meeting about Q2 planning"
- "Went to the gym and did leg day workout including squats and lunges" -> "Gym leg day workout"

Your summary:`,
    });

    return text.trim();
  } catch (error) {
    console.error("❌ AI Summarize Error:", error);
    // Fallback: just return first 50 chars without "..."
    return task.substring(0, TASK_LENGTH_THRESHOLD);
  }
}

// Generate personalized note acknowledgment
export async function generateNoteAck(noteContent: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `You are a friendly journal assistant. The user just saved a quick note. Acknowledge it warmly.

Note: "${noteContent}"

Write a SHORT acknowledgment (1 sentence, under 10 words) that:
- References what they said (mood, activity, thought)
- Feels personal, not generic
- Starts with the 📝 emoji

Tone: Warm, understanding, like a friend.

Examples:
- Note: "feeling exhausted today" -> "📝 Rough day. Take it easy."
- Note: "coffee break!" -> "📝 Coffee time! Enjoy."
- Note: "need to call mom later" -> "📝 Reminder noted. Good call."
- Note: "frustrated with this bug" -> "📝 Debugging is tough. Hang in there."

Your acknowledgment:`,
    });

    return text.trim();
  } catch (error) {
    console.error("❌ AI Note Ack Error:", error);
    return "📝 Got it! Saved.";
  }
}