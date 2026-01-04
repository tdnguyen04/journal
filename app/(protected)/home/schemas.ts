import { z } from 'zod';

export const LogSchema = z.object({
  content: z.string().min(1, "Log cannot be empty"),
});

export type LogFormValues = z.infer<typeof LogSchema>;