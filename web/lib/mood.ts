// Shared by the server (which produces the mood read) and the browser (which shows it).
export const MOOD_LEVELS = ["Frustrated", "Mixed", "Upbeat"] as const;
export type Mood = { level: (typeof MOOD_LEVELS)[number]; reason: string; quotes: string[] };
