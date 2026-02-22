import { API_BASE } from "./api";

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

export async function cycleChat(payload: CycleChatPayload): Promise<CycleChatResponse> {
  // Try primary route first, then fallback route for older server versions.
  const paths = ["/ai/cycle-chat", "/ai/chat"];
  let lastError = "";

  for (const path of paths) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // keep null and fall through to error handling
      }

      if (res.ok && data && typeof data.answer === "string") {
        return { answer: data.answer };
      }

      if (!res.ok) {
        lastError = data?.error || `HTTP ${res.status} (${path})`;
        continue;
      }

      lastError = `Non-JSON response (${res.status}) from ${path}: ${text.slice(0, 120)}`;
    } catch (e: any) {
      lastError = e?.message || "Network error";
    }
  }

  return {
    answer:
      `I can’t reach the AI service right now. Check that the backend is running and API_BASE is correct, then try again.${lastError ? ` (${lastError})` : ""}`,
  };
}
