import { API_BASE } from "./api";
import { postJSON } from "./http";

export type CycleLog = {
  userId: string;
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
};

export async function saveLog(log: CycleLog) {
  // POST body = log object
  return postJSON<{ ok: true; log: CycleLog }>("/logs/save", log);
}

export async function fetchRecentCycleLogs(params: { userId: string; limit?: number }) {
  const { userId, limit = 60 } = params;

  const url = `${API_BASE}/logs/recent?userId=${encodeURIComponent(userId)}&limit=${encodeURIComponent(
    String(limit)
  )}`;

  const res = await fetch(url, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as { ok: true; logs: CycleLog[] };
}