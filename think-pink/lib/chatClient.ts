import { postJSON } from "./http";

export type UserSnapshot = {
  userId: string;
  todayISO: string;
  todayPhase?: string;
  lastPeriodStartISO?: string;
  dietaryPrefs?: string;
  cycleDayToday?: number;
  typicalByPhase?: Record<string, { topMoods: string[]; topSymptoms: string[] }>;
  recentLogs?: Array<{
    dateISO: string;
    cycleDay?: number;
    phase?: string;
    mood?: number;
    energy?: number;
    symptoms?: string[];
    notes?: string;
    periodStart?: boolean;
    periodEnd?: boolean;
    spotting?: boolean;
  }>;
};

export type CycleChatPayload = { message: string; snapshot: UserSnapshot };
export type CycleChatResponse = { answer: string };

export function cycleChat(payload: CycleChatPayload) {
  // IMPORTANT: server expects { message, snapshot } not { params: { ... } }
  return postJSON<CycleChatResponse>("/ai/cycle-chat", payload);
}