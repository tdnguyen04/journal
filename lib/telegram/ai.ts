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