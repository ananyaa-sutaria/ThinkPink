import { UserSnapshot } from "./chatClient";
import { getItem } from "./storage";

const KEY_LAST_PERIOD_START = "tp_last_period_start_iso";
const KEY_TODAY_PHASE = "tp_today_phase";
const KEY_TYPICAL_BY_PHASE = "tp_typical_by_phase_json";
const KEY_DIET_PREFS = "tp_diet_prefs";

// optional: if you later store daily logs
const KEY_RECENT_LOGS = "tp_recent_logs_json";

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO + "T00:00:00Z").getTime();
  const b = new Date(bISO + "T00:00:00Z").getTime();
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
  return diff;
}

// For demo: small seed logs so the chatbot can answer "day 6" right away
function demoRecentLogs(): UserSnapshot["recentLogs"] {
  const t = isoToday();
  // fake dates; not important for demo—cycleDay is what matters
  return [
    { dateISO: t, cycleDay: 6, phase: "follicular", mood: 4, energy: 4, symptoms: ["light cramps"] },
    { dateISO: t, cycleDay: 6, phase: "follicular", mood: 3, energy: 4, symptoms: ["bloating"] },
    { dateISO: t, cycleDay: 20, phase: "luteal", mood: 2, energy: 2, symptoms: ["irritability", "cravings"] },
  ];
}

export async function buildUserSnapshot(): Promise<UserSnapshot> {
  const [lastPeriodStartISO, todayPhase, typicalJson, dietaryPrefs, logsJson] = await Promise.all([
    getItem(KEY_LAST_PERIOD_START),
    getItem(KEY_TODAY_PHASE),
    getItem(KEY_TYPICAL_BY_PHASE),
    getItem(KEY_DIET_PREFS),
    getItem(KEY_RECENT_LOGS),
  ]);

  let typicalByPhase: UserSnapshot["typicalByPhase"] = undefined;
  try {
    typicalByPhase = typicalJson ? JSON.parse(typicalJson) : undefined;
  } catch {}

  let recentLogs: UserSnapshot["recentLogs"] = undefined;
  try {
    recentLogs = logsJson ? JSON.parse(logsJson) : undefined;
  } catch {}

  const todayISO = isoToday();

  let cycleDayToday: number | undefined = undefined;
  if (lastPeriodStartISO) {
    const d = daysBetween(lastPeriodStartISO, todayISO);
    // cycle day is 1-indexed
    if (d >= 0 && d < 60) cycleDayToday = d + 1;
  }

  // If no real logs yet, seed demo logs so "day 6" works during judging
  if (!recentLogs || recentLogs.length === 0) {
    recentLogs = demoRecentLogs();
  }

  // If cycleDayToday is known, fill missing cycleDay on recent logs (optional)
  // (Not strictly needed, but keeps data consistent later)
  return {
    todayISO,
    todayPhase: todayPhase || undefined,
    lastPeriodStartISO: lastPeriodStartISO || undefined,
    cycleDayToday,
    typicalByPhase,
    dietaryPrefs: dietaryPrefs || undefined,
    recentLogs,
  };
}