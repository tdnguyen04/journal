import { z } from 'zod';

export const PreferencesSchema = z.object({
  preferences: z.string().min(1, "Preferences cannot be empty"),
});

export type PreferencesFormValues = z.infer<typeof PreferencesSchema>;

