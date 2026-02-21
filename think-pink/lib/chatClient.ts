const API_BASE = "http://localhost:5000";

export type UserSnapshot = {
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
    mood?: number;   // 1-5
    energy?: number; // 1-5
    symptoms?: string[];
    notes?: string;
  }>;
};

export async function askCycleChat(params: { message: string; snapshot: UserSnapshot }) {
  const res = await fetch(`${API_BASE}/ai/cycle-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Chat failed");
  return data as { answer: string };
}