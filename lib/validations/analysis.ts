import { z } from 'zod';

export const AnalysisSchema = z.object({
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']),
  summary: z.string().describe("A very short, punchy summary of the log (max 10 words)."),
  tags: z.array(z.string()).describe("3-5 tags categorizing the log."),
  
  // This is where the magic happens. 
  // We ask the AI to extract specific metrics based on user preferences.
  metrics: z.array(z.object({
    label: z.string().describe("The name of the metric (e.g., 'Bench Press', 'Caffeine', 'Reading')"),
    value: z.string().describe("The value (e.g., '185 lbs', '2 cups', '30 mins')"),
  })).describe("Key data points extracted based on user preferences"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;